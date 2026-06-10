import { NextRequest, NextResponse } from "next/server";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectRequestId, contractorId, reason } = await req.json();

  if (!projectRequestId || !contractorId || !reason) {
    return NextResponse.json({ error: "projectRequestId, contractorId, and reason are required" }, { status: 400 });
  }

  const existing = await prisma.dispute.findUnique({ where: { projectRequestId } });
  if (existing) {
    return NextResponse.json({ error: "Dispute already exists for this lead" }, { status: 409 });
  }

  const dispute = await prisma.dispute.create({
    data: { projectRequestId, contractorId, reason },
  });

  await prisma.projectRequest.update({
    where: { id: projectRequestId },
    data: { status: "DISPUTED" },
  });

  await logAuditEvent({
    eventType: "DISPUTE_OPENED",
    description: `Dispute opened: ${reason}`,
    actorId: session.id,
    projectRequestId,
    metadata: { disputeId: dispute.id, reason },
  });

  return NextResponse.json(dispute, { status: 201 });
}
