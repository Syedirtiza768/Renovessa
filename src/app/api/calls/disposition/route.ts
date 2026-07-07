import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { assertAdminAccess } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";

const dispositionSchema = z.object({
  callLogId: z.string().optional(),
  outcome: z.enum([
    "answered",
    "no_answer",
    "busy",
    "voicemail",
    "wrong_number",
    "confirmed",
    "callback_requested",
  ]),
  note: z.string().optional(),
});

/**
 * Records a post-call disposition for the agent's most recent call (or a
 * specific CallLog). Updates the CallLog and writes a CALL_MADE audit event
 * with the outcome + note, linked to the call's lead/contractor so it shows up
 * in the lead audit trail alongside the manual CommunicationLog entries.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  try {
    await assertAdminAccess(session);

    const input = dispositionSchema.parse(await req.json());

    let callLog = null;
    if (input.callLogId) {
      callLog = await prisma.callLog.findUnique({ where: { id: input.callLogId } });
      if (!callLog) {
        return NextResponse.json({ error: "Call not found" }, { status: 404 });
      }
      if (callLog.agentId && callLog.agentId !== session!.id) {
        return NextResponse.json({ error: "Not your call" }, { status: 403 });
      }
    } else {
      callLog = await prisma.callLog.findFirst({
        where: { agentId: session!.id },
        orderBy: { startedAt: "desc" },
      });
      if (!callLog) {
        return NextResponse.json({ error: "No recent call to disposition" }, { status: 404 });
      }
    }

    await prisma.callLog.update({
      where: { id: callLog.id },
      data: {
        disposition: input.outcome,
        dispositionNote: input.note || null,
      },
    });

    const description = `Call to ${callLog.toNumber}: ${input.outcome.replace(/_/g, " ")}${input.note ? ` — ${input.note}` : ""}`;
    await logAuditEvent({
      eventType: "CALL_MADE",
      description,
      actorId: session!.id,
      projectRequestId: callLog.projectRequestId ?? undefined,
      metadata: {
        callSid: callLog.twilioCallSid,
        toNumber: callLog.toNumber,
        outcome: input.outcome,
        note: input.note || null,
        source: "disposition",
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    }
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Failed to save disposition" }, { status });
  }
}
