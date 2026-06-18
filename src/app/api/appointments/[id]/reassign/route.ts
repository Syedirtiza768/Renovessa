import { NextRequest, NextResponse } from "next/server";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";

const REASSIGNABLE_STATUSES = ["ACCEPTED", "SCHEDULED", "REMINDER_SENT", "CHECKED_IN"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { contractorId, reason } = await req.json().catch(() => ({}));

  if (!contractorId) {
    return NextResponse.json({ error: "contractorId is required" }, { status: 400 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { contractor: { include: { user: true } }, projectRequest: true },
  });
  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  if (!REASSIGNABLE_STATUSES.includes(appointment.status)) {
    return NextResponse.json(
      { error: `Cannot reassign in status ${appointment.status}. Must be one of: ${REASSIGNABLE_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const newContractor = await prisma.contractorProfile.findUnique({
    where: { id: contractorId },
    include: { user: true },
  });
  if (!newContractor) {
    return NextResponse.json({ error: "New contractor not found" }, { status: 404 });
  }

  if (newContractor.tier === "SUSPENDED" || newContractor.tier === "BANNED") {
    return NextResponse.json(
      { error: `Cannot assign — contractor is ${newContractor.tier.toLowerCase()}` },
      { status: 400 }
    );
  }

  const previousContractorId = appointment.contractorId;
  const previousContractorName = appointment.contractor.companyName;

  // Reset the appointment to OFFERED for the new contractor.
  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      contractorId,
      status: "OFFERED",
      opportunitySentAt: new Date(),
      acceptedAt: null,
      checkedInAt: null,
      scheduledAt: null,
      location: null,
      declineReason: null,
    },
    include: { contractor: true },
  });

  // Return lead to APPOINTMENT_OFFERED so it waits for the new contractor.
  await prisma.projectRequest.update({
    where: { id: appointment.projectRequestId },
    data: { status: "APPOINTMENT_OFFERED" },
  });

  await logAuditEvent({
    eventType: "CONTRACTOR_OFFERED",
    description: `Contractor reassigned from ${previousContractorName} to ${newContractor.companyName}${reason ? `: ${reason}` : ""}`,
    actorId: session.id,
    projectRequestId: appointment.projectRequestId,
    appointmentId: id,
    metadata: { previousContractorId, newContractorId: contractorId, reason, reassigned: true },
  });

  // Notify the new contractor of the opportunity.
  try {
    await prisma.notification.create({
      data: {
        userId: newContractor.user.id,
        title: "New appointment opportunity",
        message: `You have a new ${appointment.projectRequest.trade} opportunity in ZIP ${appointment.projectRequest.zipCode}. Log in to accept or decline.`,
        actionUrl: "/portal/contractor",
      },
    });
  } catch {
    // Notification failure is non-fatal
  }

  return NextResponse.json(updated);
}
