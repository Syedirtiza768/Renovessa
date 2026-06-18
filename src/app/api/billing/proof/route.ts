import { NextRequest, NextResponse } from "next/server";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { appointmentId } = await req.json();
  if (!appointmentId) {
    return NextResponse.json({ error: "appointmentId is required" }, { status: 400 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { invoice: true },
  });
  if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  if (appointment.invoice) return NextResponse.json({ error: "Billing proof already exists" }, { status: 409 });

  const invoice = await prisma.invoice.create({
    data: {
      appointmentId,
      contractorId: appointment.contractorId,
      amount: 0,
      status: "PENDING",
      pilotProof: true,
    },
  });

  await logAuditEvent({
    eventType: "BILLING_TRIGGER",
    description: "Pilot billing proof manually created by admin ($0 — pending approval)",
    actorId: session.id,
    appointmentId,
  });

  return NextResponse.json(invoice, { status: 201 });
}
