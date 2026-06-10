import { NextRequest, NextResponse } from "next/server";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { agentId } = await req.json();

  const lead = await prisma.projectRequest.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const updated = await prisma.projectRequest.update({
    where: { id },
    data: {
      assignedAgentId: agentId || session.id,
      status: lead.status === "NEW" ? "ASSIGNED" : lead.status,
    },
  });

  await logAuditEvent({
    eventType: "STATUS_CHANGED",
    description: `Lead assigned to agent`,
    actorId: session.id,
    projectRequestId: id,
    metadata: { assignedTo: agentId || session.id },
  });

  return NextResponse.json(updated);
}
