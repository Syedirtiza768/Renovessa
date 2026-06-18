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

    if (!canTransitionAppointment(appointment.status, "CHECKED_IN")) {
      return NextResponse.json(
        { error: `Cannot check in in status ${appointment.status} — must be SCHEDULED or REMINDER_SENT` },
        { status: 400 }
      );
    }

    await prisma.appointment.update({
      where: { id },
      data: { status: "CHECKED_IN", checkedInAt: new Date() },
    });

    await logAuditEvent({
      eventType: "CHECK_IN_RECORDED",
      description: "Contractor checked in at appointment location",
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
