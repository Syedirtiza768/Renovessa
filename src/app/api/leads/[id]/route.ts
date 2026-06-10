import { NextRequest, NextResponse } from "next/server";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";
import { canTransitionLead } from "@/lib/lead-state-machine";
import type { LeadStatus } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const lead = await prisma.projectRequest.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const updateData: Record<string, any> = {};

  if (body.status && body.status !== lead.status) {
    if (!canTransitionLead(lead.status, body.status as LeadStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${lead.status} to ${body.status}` },
        { status: 400 }
      );
    }
    updateData.status = body.status;
  }

  if (body.qualificationNotes !== undefined) updateData.qualificationNotes = body.qualificationNotes;
  if (body.disposition !== undefined) updateData.disposition = body.disposition;
  if (body.assignedAgentId !== undefined) updateData.assignedAgentId = body.assignedAgentId;
  if (body.ownershipAuthority !== undefined) updateData.ownershipAuthority = body.ownershipAuthority;
  if (body.reachable !== undefined) updateData.reachable = body.reachable;
  if (body.invalidReason !== undefined) updateData.invalidReason = body.invalidReason;

  const updated = await prisma.projectRequest.update({
    where: { id },
    data: updateData,
  });

  await logAuditEvent({
    eventType: "STATUS_CHANGED",
    description: body.status && body.status !== lead.status
      ? `Lead status changed from ${lead.status} to ${body.status}`
      : `Lead ${id} updated`,
    actorId: session.id,
    projectRequestId: id,
    metadata: body.status && body.status !== lead.status
      ? { from: lead.status, to: body.status }
      : undefined,
  });

  return NextResponse.json(updated);
}
