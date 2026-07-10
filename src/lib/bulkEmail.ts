import { prisma } from "./db";
import { getSendGridClient, SendGridError } from "./sendgrid";
import { logAuditEvent } from "./audit";
import { resolveSegment, type SegmentFilters } from "./emailSegments";
import { interpolate, type EmailAudience, type EmailContext } from "./emailTemplates";
import { complianceFooter, complianceFooterHtml, normalizeEmail } from "./unsubscribe";

/**
 * Bulk campaign sender. Re-resolves the campaign's segment at send time (so the
 * list reflects current data and suppressions), then renders and sends each
 * recipient's email individually — every message body is fully personalized,
 * including a unique unsubscribe link, so per-recipient rendering is required.
 *
 * Sends are processed in small concurrent chunks with a pause between chunks to
 * stay within SendGrid rate limits. Each recipient gets its own EmailMessage row
 * (linked back to the campaign and, where known, the project/contractor) so the
 * send shows up in the existing per-contact communication timeline.
 */

const CHUNK_SIZE = 20;
const CHUNK_PAUSE_MS = 1000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface SendCampaignResult {
  total: number;
  sent: number;
  failed: number;
}

/** Turns a plain-text body into simple, email-safe HTML (paragraphs + <br>). */
function bodyToHtml(text: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paragraphs = text
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return (
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;` +
    `font-size:15px;line-height:1.55;color:#1a1a1a">${paragraphs}`
  );
}

/**
 * Renders one recipient's email. Returns a plain-text body (the DB/timeline copy
 * and the multipart text fallback, footer as a raw URL) and an HTML body (what
 * inboxes render, footer as a labelled "Unsubscribe" hyperlink).
 */
function render(
  subjectTemplate: string,
  bodyTemplate: string,
  context: EmailContext,
  email: string
): { subject: string; text: string; html: string } {
  const rendered = interpolate(bodyTemplate, context);
  return {
    subject: interpolate(subjectTemplate, context).trim(),
    text: rendered + complianceFooter(email),
    html: `${bodyToHtml(rendered)}${complianceFooterHtml(email)}</div>`,
  };
}

export async function sendCampaign(campaignId: string): Promise<SendCampaignResult> {
  const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new SendGridError("Campaign not found");
  if (campaign.status === "sending") throw new SendGridError("Campaign is already sending");
  if (campaign.status === "sent") throw new SendGridError("Campaign has already been sent");

  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  if (!fromEmail) throw new SendGridError("SENDGRID_FROM_EMAIL is not set");
  const fromName = process.env.SENDGRID_FROM_NAME || "Renovessa Ops";
  const replyTo =
    campaign.replyTo || process.env.SENDGRID_REPLY_TO || fromEmail;

  // The sender's name fills {{agentName}} in every rendered email. Prefer the
  // campaign owner's name, then the configured From name.
  const owner = campaign.ownerAgentId
    ? await prisma.user.findUnique({ where: { id: campaign.ownerAgentId }, select: { name: true } })
    : null;
  const agentName = owner?.name || fromName;

  const recipients = await resolveSegment(
    campaign.audience as EmailAudience,
    (campaign.filters as SegmentFilters) || {}
  );

  await prisma.emailCampaign.update({
    where: { id: campaign.id },
    data: { status: "sending", totalRecipients: recipients.length },
  });

  const client = getSendGridClient();
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
    const chunk = recipients.slice(i, i + CHUNK_SIZE);
    const results = await Promise.allSettled(
      chunk.map(async (r) => {
        const { subject, text, html } = render(
          campaign.subject,
          campaign.bodyTemplate,
          { ...r.context, agentName: r.context.agentName || agentName },
          r.email
        );

        let status = "sent";
        let sendgridMessageId: string | null = null;
        try {
          const [response] = await client.send({
            to: r.email,
            from: { email: fromEmail, name: fromName },
            replyTo,
            subject,
            text,
            html,
          });
          sendgridMessageId = (response.headers["x-message-id"] as string | undefined) ?? null;
        } catch (e) {
          status = "failed";
        }

        await prisma.emailMessage.create({
          data: {
            sendgridMessageId,
            fromEmail,
            toEmail: normalizeEmail(r.email),
            subject,
            body: text,
            status,
            agentId: campaign.ownerAgentId,
            campaignId: campaign.id,
            projectRequestId: r.projectRequestId,
            contractorId: r.contractorId,
          },
        });

        if (status === "sent") return true;
        throw new Error("send failed");
      })
    );

    for (const res of results) {
      if (res.status === "fulfilled") sent += 1;
      else failed += 1;
    }

    // Update running counters so the detail page reflects progress mid-send.
    await prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: { sentCount: sent, failedCount: failed },
    });

    if (i + CHUNK_SIZE < recipients.length) await sleep(CHUNK_PAUSE_MS);
  }

  await prisma.emailCampaign.update({
    where: { id: campaign.id },
    data: {
      status: failed > 0 && sent === 0 ? "failed" : "sent",
      sentCount: sent,
      failedCount: failed,
      sentAt: new Date(),
    },
  });

  await logAuditEvent({
    eventType: "CAMPAIGN_SENT",
    description: `Campaign "${campaign.name}" sent to ${sent} recipient(s)${
      failed > 0 ? ` (${failed} failed)` : ""
    }`,
    actorId: campaign.ownerAgentId ?? undefined,
    metadata: {
      campaignId: campaign.id,
      audience: campaign.audience,
      sent,
      failed,
    },
  });

  return { total: recipients.length, sent, failed };
}
