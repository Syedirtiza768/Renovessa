import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";
import { assertContractorOwnsAppointment } from "@/lib/authorization";
import { canTransitionAppointment } from "@/lib/appointment-state-machine";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  try {
    const { id } = await params;
    const appointment = await assertContractorOwnsAppointment(session, id);

    if (!canTransitionAppointment(appointment.status, "ACCEPTED")) {
      return NextResponse.json(
        { error: `Cannot accept in status ${appointment.status} — must be OFFERED` },
        { status: 400 }
      );
    }

    await prisma.appointment.update({
      where: { id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    await prisma.projectRequest.update({
      where: { id: appointment.projectRequestId },
      data: { status: "APPOINTMENT_CONFIRMED" },
    });

    await logAuditEvent({
      eventType: "CONTRACTOR_ACCEPTED",
      description: "Contractor accepted appointment",
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
