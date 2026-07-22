import { NextRequest, NextResponse } from "next/server";
import { getTwilioWebhookBaseUrl, verifyTwilioSignature } from "@/lib/twilio";
import { recordCommunicationOptOut, requestEvidence } from "@/lib/compliance";

const OPT_OUT_WORDS = new Set(["stop", "stopall", "unsubscribe", "cancel", "end", "quit", "revoke", "optout"]);

function twiml(message?: string) {
  const body = message
    ? `<Response><Message>${message}</Message></Response>`
    : "<Response></Response>";
  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

/** Signed Twilio inbound-message webhook with durable STOP evidence. */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const body = Object.fromEntries(new URLSearchParams(rawBody));
  const url = `${getTwilioWebhookBaseUrl()}${req.nextUrl.pathname}${req.nextUrl.search}`;

  if (!verifyTwilioSignature({
    signature: req.headers.get("x-twilio-signature"),
    url,
    body,
  })) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const from = body.From;
  const keyword = body.Body?.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (!from || !keyword) return new NextResponse("Bad Request", { status: 400 });

  if (!OPT_OUT_WORDS.has(keyword)) return twiml();

  const evidence = requestEvidence(req);
  await Promise.all([
    recordCommunicationOptOut({
      channel: "SMS",
      value: from,
      reason: `inbound_${keyword}`,
      source: "twilio_inbound_sms",
      evidence,
    }),
    recordCommunicationOptOut({
      channel: "PHONE",
      value: from,
      reason: `inbound_${keyword}`,
      source: "twilio_inbound_sms",
      evidence,
    }),
  ]);

  return twiml("Renovessa: You are opted out of automated calls and texts. No more messages will be sent. Reply HELP for support.");
}
