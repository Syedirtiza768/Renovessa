import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySendGridSignature } from "@/lib/sendgridWebhook";
import { normalizeEmail } from "@/lib/unsubscribe";

export const runtime = "nodejs";

/**
 * SendGrid Event Webhook. SendGrid POSTs a JSON array of delivery events
 * (delivered, open, click, bounce, dropped, spamreport, unsubscribe…). We:
 *   1. verify the request signature (when a verification key is configured),
 *   2. match each event to its EmailMessage via sg_message_id and stamp the
 *      corresponding lifecycle timestamp + status,
 *   3. auto-suppress addresses that bounced, complained, or unsubscribed so
 *      future segments and sends skip them.
 *
 * Suppression is keyed on the event's email address, so it works even for
 * messages we can't match (e.g. very old sends).
 */

interface SendGridEvent {
  event: string;
  email?: string;
  timestamp?: number;
  sg_message_id?: string;
}

const NEGATIVE_STATUSES = new Set(["bounced", "dropped", "complaint", "unsubscribed"]);

function eventTime(ev: SendGridEvent): Date {
  return ev.timestamp ? new Date(ev.timestamp * 1000) : new Date();
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const valid = verifySendGridSignature({
    rawBody,
    signature: req.headers.get("x-twilio-email-event-webhook-signature"),
    timestamp: req.headers.get("x-twilio-email-event-webhook-timestamp"),
  });
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let events: SendGridEvent[];
  try {
    events = JSON.parse(rawBody);
    if (!Array.isArray(events)) throw new Error("expected array");
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  for (const ev of events) {
    await processEvent(ev).catch(() => {
      // Never fail the whole batch on one bad event — SendGrid would retry all.
    });
  }

  return NextResponse.json({ received: events.length });
}

async function processEvent(ev: SendGridEvent) {
  const when = eventTime(ev);

  // Suppress first — independent of whether we can match the message.
  const suppressReason =
    ev.event === "bounce" || ev.event === "dropped"
      ? "bounce"
      : ev.event === "spamreport"
      ? "complaint"
      : ev.event === "unsubscribe" || ev.event === "group_unsubscribe"
      ? "unsubscribe"
      : null;

  if (suppressReason && ev.email) {
    const email = normalizeEmail(ev.email);
    await prisma.emailSuppression.upsert({
      where: { email },
      update: {},
      create: { email, reason: suppressReason },
    });
  }

  if (!ev.sg_message_id) return;

  // sg_message_id is "<x-message-id>.<recv>.<filter>…"; the stored value is the
  // x-message-id header, i.e. the part before the first dot.
  const messageKey = ev.sg_message_id.split(".")[0];
  const message = await prisma.emailMessage.findFirst({
    where: { sendgridMessageId: messageKey },
    select: { id: true, status: true },
  });
  if (!message) return;

  const data: Record<string, unknown> = {};
  switch (ev.event) {
    case "delivered":
      data.deliveredAt = when;
      if (!NEGATIVE_STATUSES.has(message.status)) data.status = "delivered";
      break;
    case "open":
      data.openedAt = when;
      if (!NEGATIVE_STATUSES.has(message.status)) data.status = "opened";
      break;
    case "click":
      data.clickedAt = when;
      if (!NEGATIVE_STATUSES.has(message.status)) data.status = "clicked";
      break;
    case "bounce":
      data.bouncedAt = when;
      data.status = "bounced";
      break;
    case "dropped":
      data.bouncedAt = when;
      data.status = "dropped";
      break;
    case "spamreport":
      data.spamReportedAt = when;
      data.status = "complaint";
      break;
    case "unsubscribe":
    case "group_unsubscribe":
      data.unsubscribedAt = when;
      data.status = "unsubscribed";
      break;
    default:
      return; // processed, deferred, etc. — nothing to record
  }

  await prisma.emailMessage.update({ where: { id: message.id }, data });
}
