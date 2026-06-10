import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";
import { assertContractorOwnsAppointment } from "@/lib/authorization";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  try {
    const { id } = await params;
    const { reason } = await req.json().catch(() => ({ reason: "" }));

    const appointment = await assertContractorOwnsAppointment(session, id);

    await prisma.appointment.update({
      where: { id },
      data: {
        status: "DECLINED",
        declineReason: reason || null,
      },
    });

    await prisma.projectRequest.update({
      where: { id: appointment.projectRequestId },
      data: { status: "QUALIFIED" },
    });

    await logAuditEvent({
      eventType: "CONTRACTOR_DECLINED",
      description: `Contractor declined opportunity${reason ? `: ${reason}` : ""}`,
      actorId: session!.id,
      projectRequestId: appointment.projectRequestId,
      appointmentId: id,
      metadata: { reason },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Internal error" }, { status });
  }
}
