import { NextRequest, NextResponse } from "next/server";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";
import { canTransitionAppointment } from "@/lib/appointment-state-machine";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { outcome, estimateGiven, contractorOutcomeNotes, homeownerOutcomeNotes, followUpRequired, noShow } = body;

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { projectRequest: true },
  });
  if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

  const isAdmin = canAccessAdmin(session.role);
  const isContractor = appointment.contractorId === session.id;

  if (!isAdmin && !isContractor) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const targetStatus = noShow ? "NO_SHOW" : "COMPLETED";
  if (!canTransitionAppointment(appointment.status, targetStatus as any)) {
    return NextResponse.json(
      { error: `Cannot record outcome in status ${appointment.status}` },
      { status: 400 }
    );
  }

  const updateData: Record<string, any> = {
    status: targetStatus,
  };
  if (estimateGiven !== undefined) updateData.estimateGiven = estimateGiven;
  if (contractorOutcomeNotes !== undefined) updateData.contractorOutcomeNotes = contractorOutcomeNotes;
  if (homeownerOutcomeNotes !== undefined) updateData.homeownerOutcomeNotes = homeownerOutcomeNotes;
  if (followUpRequired !== undefined) updateData.followUpRequired = followUpRequired;

  const updated = await prisma.appointment.update({
    where: { id },
    data: updateData,
  });

  await prisma.projectRequest.update({
    where: { id: appointment.projectRequestId },
    data: { status: "APPOINTMENT_COMPLETED" },
  });

  await logAuditEvent({
    eventType: noShow ? "STATUS_CHANGED" : "CHECK_IN_RECORDED",
    description: noShow
      ? "Contractor no-show recorded"
      : `Appointment outcome recorded${outcome ? `: ${outcome}` : ""}`,
    actorId: session.id,
    projectRequestId: appointment.projectRequestId,
    appointmentId: id,
    metadata: { outcome, estimateGiven, noShow, followUpRequired },
  });

  return NextResponse.json(updated);
}
