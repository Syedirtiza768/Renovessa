import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeEmail } from "@/lib/unsubscribe";
import { logAuditEvent } from "@/lib/audit";
import { getSendGridClient } from "@/lib/sendgrid";

export const runtime = "nodejs";

/**
 * SendGrid Inbound Parse webhook. When a prospect replies to a campaign email,
 * SendGrid POSTs the parsed message here as multipart/form-data (fields: from,
 * to, subject, text, html, envelope, …). We:
 *   1. optionally check a shared secret (?key=) so forged replies can't be injected,
 *   2. record the reply as an inbound EmailMessage linked to the original send,
 *   3. flip the matching prospect (ContractorInquiry) to status "replied",
 *   4. notify the owning agent (Ray) so they can act on it immediately.
 *
 * Inbound Parse is not signed like the event webhook, so if INBOUND_PARSE_TOKEN
 * is set it must be present as ?key=… on the configured POST URL. If it is not
 * set, verification is disabled (convenient for first setup).
 *
 * DNS/SendGrid setup (manual, one-time): point an MX record for the receiving
 * domain at mx.sendgrid.net and set the Inbound Parse host + URL to
 * https://<app>/api/webhooks/sendgrid/inbound?key=<INBOUND_PARSE_TOKEN>.
 */

/** Pulls a bare email address out of a "Name <email>" or raw-email string. */
function extractEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const angle = raw.match(/<([^>]+)>/);
  const candidate = (angle ? angle[1] : raw).trim();
  const at = candidate.match(/[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+/);
  return at ? at[0] : null;
}

function verifyToken(req: NextRequest): boolean {
  const expected = process.env.INBOUND_PARSE_TOKEN;
  if (!expected) return true; // verification disabled
  return req.nextUrl.searchParams.get("key") === expected;
}

export async function POST(req: NextRequest) {
  if (!verifyToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const get = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : null;
  };

  // Prefer the SMTP envelope's from (a bare address); fall back to the header.
  let senderEmail: string | null = null;
  const envelope = get("envelope");
  if (envelope) {
    try {
      senderEmail = extractEmail(JSON.parse(envelope).from);
    } catch {
      /* fall through to header parsing */
    }
  }
  senderEmail = senderEmail || extractEmail(get("from"));
  if (!senderEmail) {
    // Nothing actionable, but 200 so SendGrid doesn't retry a malformed message.
    return NextResponse.json({ received: true, matched: false });
  }
  const email = normalizeEmail(senderEmail);

  const subject = get("subject") || "(no subject)";
  const body = (get("text") || get("html") || "").trim();
  const toEmail =
    extractEmail(get("to")) || process.env.SENDGRID_REPLY_TO || process.env.SENDGRID_FROM_EMAIL || "";

  // Link the reply back to the most recent send we made to this address so it
  // inherits the campaign/agent and shows up in the right timeline.
  const original = await prisma.emailMessage.findFirst({
    where: { toEmail: email, direction: "outbound" },
    orderBy: { createdAt: "desc" },
    select: { id: true, agentId: true, campaignId: true },
  });

  await prisma.emailMessage.create({
    data: {
      fromEmail: email,
      toEmail,
      subject,
      body: body || "(empty reply)",
      status: "received",
      direction: "inbound",
      replyToMessageId: original?.id ?? null,
      agentId: original?.agentId ?? null,
      campaignId: original?.campaignId ?? null,
    },
  });

  // Flip the prospect to "replied" so it drops out of future cold sends and
  // surfaces in the ops "needs attention" view.
  const prospect = await prisma.contractorInquiry.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, companyName: true },
  });
  if (prospect) {
    await prisma.contractorInquiry.update({
      where: { id: prospect.id },
      data: { status: "replied" },
    });
  }

  // Notify the owning agent (Ray). If we can't resolve one from the original
  // send, fall back to everyone on the contractor-acquisition desk.
  const who = prospect?.companyName || email;
  const snippet = body.replace(/\s+/g, " ").slice(0, 140);
  const recipientIds = original?.agentId
    ? [original.agentId]
    : (
        await prisma.user.findMany({
          where: { role: "CONTRACTOR_ACQUISITION" },
          select: { id: true },
        })
      ).map((u) => u.id);

  if (recipientIds.length > 0) {
    await prisma.notification.createMany({
      data: recipientIds.map((userId) => ({
        userId,
        title: `New reply from ${who}`,
        message: snippet || "(empty reply)",
        actionUrl: "/portal/admin/replies",
      })),
    });
  }

  await logAuditEvent({
    eventType: "EMAIL_REPLIED",
    description: `Reply received from ${who} <${email}>: "${subject}"`,
    actorId: original?.agentId ?? undefined,
    metadata: { from: email, subject, campaignId: original?.campaignId ?? null },
  });

  // Best-effort: forward a copy to a human mailbox (e.g. Ray's) so replies also
  // land in normal email, with reply-to set to the prospect so a reply from that
  // mailbox reaches them directly. Never fail capture if forwarding errors.
  const forwardTo = process.env.REPLIES_FORWARD_TO;
  const forwardFrom = process.env.SENDGRID_FROM_EMAIL;
  if (forwardTo && forwardFrom) {
    try {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
      await getSendGridClient().send({
        to: forwardTo,
        from: { email: forwardFrom, name: "Renovessa Replies" },
        replyTo: email,
        subject: `Reply from ${who}: ${subject}`,
        text:
          `${who} <${email}> replied to "${subject}":\n\n${body || "(empty reply)"}\n\n` +
          `— Reply directly to this email to respond to them.` +
          (appUrl ? `\nView in app: ${appUrl}/portal/admin/replies` : ""),
      });
    } catch {
      /* forwarding is best-effort */
    }
  }

  return NextResponse.json({ received: true, matched: Boolean(original), prospect: Boolean(prospect) });
}
