import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";
import { assertLeadAccess } from "@/lib/authorization";

const VALID_STATUSES = ["SCHEDULED", "REMINDER_SENT", "CHECKED_IN", "COMPLETED", "HOMEOWNER_CONFIRMED"];

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  try {
    const { id } = await params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { projectRequest: true, invoice: true },
    });
    if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    await assertLeadAccess(session, appointment.projectRequestId);

    if (!VALID_STATUSES.includes(appointment.status)) {
      return NextResponse.json(
        { error: `Cannot confirm appointment in status ${appointment.status}. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    // Mark appointment confirmed.
    await prisma.appointment.update({
      where: { id },
      data: {
        status: "HOMEOWNER_CONFIRMED",
        homeownerConfirmedAt: new Date(),
      },
    });

    // Step 1: advance lead to HOMEOWNER_CONFIRMED (correct state machine step).
    await prisma.projectRequest.update({
      where: { id: appointment.projectRequestId },
      data: { status: "HOMEOWNER_CONFIRMED" },
    });

    await logAuditEvent({
      eventType: "HOMEOWNER_CONFIRMED",
      description: "Homeowner confirmed appointment occurred",
      actorId: session!.id,
      projectRequestId: appointment.projectRequestId,
      appointmentId: id,
    });

    // Step 2: auto-create a $0 pilot invoice if one doesn't exist yet.
    if (!appointment.invoice) {
      await prisma.invoice.create({
        data: {
          appointmentId: id,
          contractorId: appointment.contractorId,
          amount: 0,
          status: "PENDING",
          pilotProof: true,
        },
      });
    }

    // Step 3: advance lead to BILLING_PENDING now that invoice exists.
    await prisma.projectRequest.update({
      where: { id: appointment.projectRequestId },
      data: { status: "BILLING_PENDING" },
    });

    await logAuditEvent({
      eventType: "BILLING_TRIGGER",
      description: "Pilot billing proof auto-created ($0 — pending admin approval)",
      actorId: session!.id,
      projectRequestId: appointment.projectRequestId,
      appointmentId: id,
    });

    // Step 4: notify admin that billing proof is ready.
    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: ["SUPER_ADMIN", "OPS_MANAGER", "FINANCE_MANAGER"] } },
        select: { id: true },
      });
      await Promise.all(
        admins.map((admin) =>
          prisma.notification.create({
            data: {
              userId: admin.id,
              title: "Billing proof ready",
              message: `Homeowner confirmed appointment for lead ${appointment.projectRequestId}. Billing proof pending approval.`,
              actionUrl: `/portal/admin/leads/${appointment.projectRequestId}`,
            },
          })
        )
      );
    } catch {
      // Notification failure is non-fatal
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Internal error" }, { status });
  }
}
