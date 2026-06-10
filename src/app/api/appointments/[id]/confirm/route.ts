import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";
import { assertLeadAccess } from "@/lib/authorization";

const VALID_STATUSES = ["SCHEDULED", "REMINDER_SENT", "CHECKED_IN", "COMPLETED", "HOMEOWNER_CONFIRMED"];

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  try {
    const { id } = await params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { projectRequest: true },
    });
    if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    await assertLeadAccess(session, appointment.projectRequestId);

    if (!VALID_STATUSES.includes(appointment.status)) {
      return NextResponse.json(
        { error: `Cannot confirm appointment in status ${appointment.status}. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: "HOMEOWNER_CONFIRMED",
        homeownerConfirmedAt: new Date(),
      },
    });

    await prisma.projectRequest.update({
      where: { id: appointment.projectRequestId },
      data: { status: "HOMEOWNER_CONFIRMED" },
    });

    await logAuditEvent({
      eventType: "HOMEOWNER_CONFIRMED",
      description: "Homeowner confirmed appointment occurred",
      actorId: session!.id,
      projectRequestId: appointment.projectRequestId,
      appointmentId: id,
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Internal error" }, { status });
  }
}
