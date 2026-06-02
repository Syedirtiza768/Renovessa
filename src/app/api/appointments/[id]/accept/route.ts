import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "CONTRACTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const appointment = await prisma.appointment.update({
    where: { id },
    data: {
      status: "ACCEPTED",
      acceptedAt: new Date(),
    },
    include: { projectRequest: true },
  });

  await prisma.projectRequest.update({
    where: { id: appointment.projectRequestId },
    data: { status: "APPOINTMENT_CONFIRMED" },
  });

  await logAuditEvent({
    eventType: "CONTRACTOR_ACCEPTED",
    description: "Contractor accepted appointment",
    actorId: session.id,
    projectRequestId: appointment.projectRequestId,
    appointmentId: id,
  });

  return NextResponse.json({ success: true });
}
