import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTwilioWebhookBaseUrl, verifyTwilioSignature } from "@/lib/twilio";
import { logAuditEvent } from "@/lib/audit";

const FINAL_STATUSES = ["completed", "busy", "failed", "no-answer", "canceled"];

/** Twilio status callback: updates the CallLog as the call progresses/ends. */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const body = Object.fromEntries(new URLSearchParams(rawBody));

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

  const callSid = body.CallSid;
  const status = body.CallStatus;
  if (!callSid || !status) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const callLog = await prisma.callLog.findUnique({ where: { twilioCallSid: callSid } });
  if (!callLog) {
    return new NextResponse("OK", { status: 200 });
  }

  const durationSeconds = body.CallDuration ? parseInt(body.CallDuration, 10) : undefined;
  const isFinal = FINAL_STATUSES.includes(status);

  await prisma.callLog.update({
    where: { id: callLog.id },
    data: {
      status,
      durationSeconds,
      endedAt: isFinal ? new Date() : undefined,
    },
  });

  if (isFinal && callLog.agentId) {
    await logAuditEvent({
      eventType: "CALL_MADE",
      description: `Call to ${callLog.toNumber} ended: ${status}${durationSeconds ? ` (${durationSeconds}s)` : ""}`,
      actorId: callLog.agentId,
      projectRequestId: callLog.projectRequestId ?? undefined,
      metadata: { callSid, status, durationSeconds },
    });
  }

  return new NextResponse("OK", { status: 200 });
}
