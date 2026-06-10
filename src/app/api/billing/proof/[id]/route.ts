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
  const { action, waivedReason } = await req.json();

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { appointment: true },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  let updateData: Record<string, any> = {};

  if (action === "approve") {
    updateData = { status: "APPROVED", approvedById: session.id, approvedAt: new Date() };
    await prisma.appointment.update({
      where: { id: invoice.appointmentId },
      data: { billingApproved: true },
    });
    await prisma.projectRequest.update({
      where: { id: invoice.appointment.projectRequestId },
      data: { status: "BILLING_APPROVED" },
    });
  } else if (action === "waive") {
    updateData = { status: "CREDITED", waivedReason: waivedReason || null, approvedById: session.id, approvedAt: new Date() };
    await logAuditEvent({
      eventType: "CREDIT_ISSUED",
      description: `Invoice waived: ${waivedReason || "No reason given"}`,
      actorId: session.id,
      projectRequestId: invoice.appointment.projectRequestId,
      appointmentId: invoice.appointmentId,
    });
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}
