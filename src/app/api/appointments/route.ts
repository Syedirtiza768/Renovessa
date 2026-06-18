import { NextRequest, NextResponse } from "next/server";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectRequestId, contractorId, amount, notes } = await req.json();

  if (!projectRequestId || !contractorId) {
    return NextResponse.json({ error: "projectRequestId and contractorId are required" }, { status: 400 });
  }

  const lead = await prisma.projectRequest.findUnique({ where: { id: projectRequestId } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const contractor = await prisma.contractorProfile.findUnique({
    where: { id: contractorId },
    include: {
      user: { select: { id: true } },
      capacityCells: { select: { appointmentLimit: true, trade: true, zipCluster: true } },
    },
  });
  if (!contractor) return NextResponse.json({ error: "Contractor not found" }, { status: 404 });

  // Reject suspended or banned contractors.
  if (contractor.tier === "SUSPENDED" || contractor.tier === "BANNED") {
    return NextResponse.json(
      { error: `Cannot assign — contractor is ${contractor.tier.toLowerCase()}` },
      { status: 400 }
    );
  }

  // Capacity check: limit comes from the contractor's linked capacity cell(s).
  const matchingCell = contractor.capacityCells.find(
    (cell) => cell.trade === lead.trade && cell.zipCluster.includes(lead.zipCode)
  );
  const appointmentLimit =
    matchingCell?.appointmentLimit ??
    (contractor.capacityCells.length
      ? Math.max(...contractor.capacityCells.map((c) => c.appointmentLimit))
      : null);

  if (appointmentLimit) {
    const activeCount = await prisma.appointment.count({
      where: {
        contractorId,
        status: { notIn: ["DECLINED", "CANCELLED", "COMPLETED", "HOMEOWNER_CONFIRMED", "BILLED", "NO_SHOW", "DISPUTED"] },
      },
    });
    if (activeCount >= appointmentLimit) {
      return NextResponse.json(
        { error: `Contractor is at capacity (${activeCount}/${appointmentLimit} active appointments)` },
        { status: 409 }
      );
    }
  }

  const existing = await prisma.appointment.findUnique({ where: { projectRequestId } });
  if (existing && existing.status !== "DECLINED") {
    return NextResponse.json({ error: "Appointment already exists for this lead" }, { status: 409 });
  }

  let appointment;
  if (existing?.status === "DECLINED") {
    // Re-offer to same or different contractor after a decline — reset the row.
    appointment = await prisma.appointment.update({
      where: { projectRequestId },
      data: {
        contractorId,
        status: "OFFERED",
        amount: amount ?? null,
        opportunitySentAt: new Date(),
        declineReason: null,
        acceptedAt: null,
        checkedInAt: null,
        homeownerConfirmedAt: null,
        scheduledAt: null,
        location: null,
      },
      include: { contractor: true },
    });
  } else {
    appointment = await prisma.appointment.create({
      data: {
        projectRequestId,
        contractorId,
        status: "OFFERED",
        amount: amount ?? null,
        opportunitySentAt: new Date(),
      },
      include: { contractor: true },
    });
  }

  await prisma.projectRequest.update({
    where: { id: projectRequestId },
    data: { status: "APPOINTMENT_OFFERED" },
  });

  await logAuditEvent({
    eventType: "CONTRACTOR_OFFERED",
    description: `Opportunity sent to ${contractor.companyName}`,
    actorId: session.id,
    projectRequestId,
    appointmentId: appointment.id,
    metadata: { contractorId, notes, manualSend: notes?.includes("manual") ?? false },
  });

  // Notify the contractor of the new opportunity.
  try {
    await prisma.notification.create({
      data: {
        userId: contractor.user.id,
        title: "New appointment opportunity",
        message: `You have a new ${lead.trade} opportunity in ZIP ${lead.zipCode}. Log in to accept or decline.`,
        actionUrl: "/portal/contractor",
      },
    });
  } catch {
    // Notification failure is non-fatal
  }

  return NextResponse.json(appointment, { status: 201 });
}
