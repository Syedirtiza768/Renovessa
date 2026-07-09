import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";
import { getTwilioWebhookBaseUrl, toE164, verifyTwilioSignature } from "@/lib/twilio";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function pick(...values: (string | null | undefined)[]): string | undefined {
  return values.find((v) => v && v.trim() !== "") || undefined;
}

/**
 * Twilio webhook used as the TwiML App voice URL for both:
 *  - click-to-call (params in the query string, set by placeCall())
 *  - browser softphone (params in the POST body, sent by @twilio/voice-sdk)
 *
 * Returns TwiML that bridges the agent to the contractor/homeowner, with the
 * agent's assigned Twilio number as caller ID. For softphone calls (which have
 * no server-side pre-registration), a CallLog is created here using the parent
 * CallSid so the status webhook can update it as the call progresses.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const body = Object.fromEntries(new URLSearchParams(rawBody));

  // Rebuild the exact URL we handed Twilio (based on our own configured app URL,
  // not the possibly-proxy-rewritten request URL) so signature validation is stable.
  const appUrl = getTwilioWebhookBaseUrl();
  const url = `${appUrl}${req.nextUrl.pathname}${req.nextUrl.search}`;

  const valid = verifyTwilioSignature({
    signature: req.headers.get("x-twilio-signature"),
    url,
    body,
  });
  if (!valid) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Softphone sends To/CallerId in the form body; click-to-call sends them in
  // the query string. Accept either. Normalize to E.164 — dialer keypad /
  // lead phones are often bare 10-digit US numbers (Twilio error 13223).
  const rawTo = pick(body.To, req.nextUrl.searchParams.get("to"));
  const rawCallerId = pick(body.CallerId, req.nextUrl.searchParams.get("callerId"));
  if (!rawTo || !rawCallerId) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  let to: string;
  let callerId: string;
  try {
    to = toE164(rawTo, "Destination number");
    callerId = toE164(rawCallerId, "Caller ID");
  } catch (e: any) {
    return new NextResponse(e?.message || "Invalid phone number", { status: 400 });
  }

  const callSid = body.CallSid;
  if (callSid) {
    const existing = await prisma.callLog.findUnique({ where: { twilioCallSid: callSid } });
    // Softphone path: no CallLog yet (click-to-call created one server-side).
    if (!existing) {
      const agentId = body.AgentId || null;
      const leadId = body.LeadId || null;
      const contractorId = body.ContractorId || null;

      const twilioNumber = await prisma.twilioPhoneNumber.findUnique({
        where: { phoneNumber: callerId },
        select: { id: true },
      });

      await prisma.callLog.create({
        data: {
          twilioCallSid: callSid,
          direction: "outbound",
          fromNumber: callerId,
          toNumber: to,
          status: body.CallStatus || "initiated",
          agentId: agentId || undefined,
          projectRequestId: leadId || undefined,
          contractorId: contractorId || undefined,
          twilioPhoneNumberId: twilioNumber?.id,
        },
      });

      if (agentId) {
        await logAuditEvent({
          eventType: "CALL_MADE",
          description: `Softphone call to ${to} via ${callerId}`,
          actorId: agentId,
          projectRequestId: leadId || undefined,
          metadata: { callSid, toNumber: to, fromNumber: callerId, source: "softphone" },
        });
      }
    }
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Dial callerId="${escapeXml(callerId)}">${escapeXml(to)}</Dial></Response>`;

  return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
}
