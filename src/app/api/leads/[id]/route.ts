import { NextRequest, NextResponse } from "next/server";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";
import type { LeadStatus } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { status } = await req.json();

  const lead = await prisma.projectRequest.update({
    where: { id },
    data: { status: status as LeadStatus },
  });

  await logAuditEvent({
    eventType: "STATUS_CHANGED",
    description: `Lead status changed to ${status}`,
    actorId: session.id,
    projectRequestId: id,
  });

  return NextResponse.json(lead);
}
