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
      status: "CHECKED_IN",
      checkedInAt: new Date(),
    },
    include: { projectRequest: true },
  });

  await logAuditEvent({
    eventType: "CHECK_IN_RECORDED",
    description: "Contractor checked in at appointment location",
    actorId: session.id,
    projectRequestId: appointment.projectRequestId,
    appointmentId: id,
  });

  return NextResponse.json({ success: true });
}
