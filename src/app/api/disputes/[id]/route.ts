import { NextRequest, NextResponse } from "next/server";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { outcome, resolutionNotes } = await req.json();

  const dispute = await prisma.dispute.findUnique({ where: { id } });
  if (!dispute) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

  const updated = await prisma.dispute.update({
    where: { id },
    data: {
      status: "RESOLVED",
      outcome: outcome || "BILL_STANDS",
      resolutionNotes: resolutionNotes || null,
    },
  });

  await prisma.projectRequest.update({
    where: { id: dispute.projectRequestId },
    data: { status: "CLOSED" },
  });

  await logAuditEvent({
    eventType: "DISPUTE_RESOLVED",
    description: `Dispute resolved: ${outcome || "BILL_STANDS"}${resolutionNotes ? ` — ${resolutionNotes}` : ""}`,
    actorId: session.id,
    projectRequestId: dispute.projectRequestId,
    metadata: { outcome, resolutionNotes },
  });

  return NextResponse.json(updated);
}
