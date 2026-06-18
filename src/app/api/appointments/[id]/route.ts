import { NextRequest, NextResponse } from "next/server";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";
import { canTransitionAppointment } from "@/lib/appointment-state-machine";
import type { AppointmentStatus, LeadStatus } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { action, scheduledAt, location, reminderNote } = body;

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { projectRequest: true },
  });
  if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

  let newStatus: AppointmentStatus | null = null;
  const updateData: Record<string, any> = {};

  switch (action) {
    case "schedule":
      newStatus = "SCHEDULED";
      updateData.scheduledAt = new Date(scheduledAt);
      updateData.location = location;
      break;
    case "reschedule":
      updateData.scheduledAt = new Date(scheduledAt);
      if (location) updateData.location = location;
      break;
    case "cancel":
      newStatus = "CANCELLED";
      break;
    case "mark_reminder_sent":
      newStatus = "REMINDER_SENT";
      break;
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  if (newStatus && !canTransitionAppointment(appointment.status, newStatus)) {
    return NextResponse.json(
      { error: `Cannot transition appointment from ${appointment.status} to ${newStatus}` },
      { status: 400 }
    );
  }

  if (newStatus) updateData.status = newStatus;

  const updated = await prisma.appointment.update({
    where: { id },
    data: updateData,
  });

  if (newStatus === "SCHEDULED") {
    await prisma.projectRequest.update({
      where: { id: appointment.projectRequestId },
      data: { status: "APPOINTMENT_CONFIRMED" },
    });
    // Notify the contractor that appointment has been scheduled.
    try {
      await prisma.notification.create({
        data: {
          userId: appointment.projectRequest.homeownerId ?? "",
          title: "Appointment scheduled",
          message: `Your appointment has been scheduled for ${new Date(scheduledAt).toLocaleString()}${location ? ` at ${location}` : ""}.`,
          actionUrl: "/portal/homeowner",
        },
      });
    } catch {
      // Notification failure is non-fatal
    }
  }

  if (newStatus === "CANCELLED") {
    await prisma.projectRequest.update({
      where: { id: appointment.projectRequestId },
      data: { status: "CLOSED" as LeadStatus },
    });
  }

  const eventDesc: Record<string, string> = {
    schedule: `Appointment scheduled for ${scheduledAt}${location ? ` at ${location}` : ""}`,
    reschedule: `Appointment rescheduled to ${scheduledAt}`,
    cancel: "Appointment cancelled — lead closed",
    mark_reminder_sent: "Reminder sent to homeowner and contractor",
  };

  await logAuditEvent({
    eventType: action === "schedule" ? "CALENDAR_INVITE_SENT" : action === "mark_reminder_sent" ? "REMINDER_SENT" : "STATUS_CHANGED",
    description: eventDesc[action] || `Appointment ${action}`,
    actorId: session.id,
    projectRequestId: appointment.projectRequestId,
    appointmentId: id,
    metadata: { action, scheduledAt, location, reminderNote },
  });

  return NextResponse.json(updated);
}
