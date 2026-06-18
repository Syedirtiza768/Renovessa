import { NextRequest, NextResponse } from "next/server";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";
import { assertContractorOwnsAppointment } from "@/lib/authorization";
import { canTransitionAppointment } from "@/lib/appointment-state-machine";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  try {
    const { id } = await params;
    const { reason } = await req.json().catch(() => ({ reason: "" }));

    // Admins can decline on behalf of contractors; contractors must own it.
    let appointment;
    if (session && canAccessAdmin(session.role)) {
      appointment = await prisma.appointment.findUnique({ where: { id } });
      if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    } else {
      appointment = await assertContractorOwnsAppointment(session, id);
    }

    if (!canTransitionAppointment(appointment.status, "DECLINED")) {
      return NextResponse.json(
        { error: `Cannot decline in status ${appointment.status} — must be OFFERED` },
        { status: 400 }
      );
    }

    await prisma.appointment.update({
      where: { id },
      data: { status: "DECLINED", declineReason: reason || null },
    });

    await prisma.projectRequest.update({
      where: { id: appointment.projectRequestId },
      data: { status: "QUALIFIED" },
    });

    await logAuditEvent({
      eventType: "CONTRACTOR_DECLINED",
      description: `Contractor declined opportunity${reason ? `: ${reason}` : ""}`,
      actorId: session!.id,
      projectRequestId: appointment.projectRequestId,
      appointmentId: id,
      metadata: { reason },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Internal error" }, { status });
  }
}
