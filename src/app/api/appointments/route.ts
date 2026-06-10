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

  const contractor = await prisma.contractorProfile.findUnique({ where: { id: contractorId } });
  if (!contractor) return NextResponse.json({ error: "Contractor not found" }, { status: 404 });

  const existing = await prisma.appointment.findUnique({ where: { projectRequestId } });
  if (existing) return NextResponse.json({ error: "Appointment already exists for this lead" }, { status: 409 });

  const appointment = await prisma.appointment.create({
    data: {
      projectRequestId,
      contractorId,
      status: "OFFERED",
      amount: amount ?? null,
      opportunitySentAt: new Date(),
    },
    include: { contractor: true },
  });

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

  return NextResponse.json(appointment, { status: 201 });
}
