import { NextRequest, NextResponse } from "next/server";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";
import type { AuditEventType } from "@prisma/client";

const CHANNEL_MAP: Record<string, AuditEventType> = {
  "call_attempted": "CALL_MADE",
  "call_completed": "CALL_MADE",
  "voicemail": "CALL_MADE",
  "sms": "SMS_SENT",
  "email": "EMAIL_SENT",
  "note": "NOTE_ADDED",
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { channel, outcome, note } = await req.json();

  const lead = await prisma.projectRequest.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const eventType = CHANNEL_MAP[channel] || "NOTE_ADDED";
  const description = channel === "note"
    ? `Internal note: ${note}`
    : `${channel.replace(/_/g, " ")}${outcome ? ` — ${outcome}` : ""}${note ? `: ${note}` : ""}`;

  await logAuditEvent({
    eventType,
    description,
    actorId: session.id,
    projectRequestId: id,
    metadata: { channel, outcome, note },
  });

  return NextResponse.json({ success: true });
}
