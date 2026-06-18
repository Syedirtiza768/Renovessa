"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const CONFIRMABLE_STATUSES = ["CHECKED_IN", "COMPLETED", "REMINDER_SENT"];
// SCHEDULED is intentionally excluded — homeowner should not be able to pre-confirm
// before the appointment has occurred.

interface Props {
  appointmentId: string;
  appointmentStatus: string;
  scheduledAt: string | null;
}

export function ConfirmAppointmentButton({ appointmentId, appointmentStatus, scheduledAt }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const statusAllows = CONFIRMABLE_STATUSES.includes(appointmentStatus);

  // Require that the appointment date has passed (or is today) before confirming.
  const dateHasPassed = scheduledAt
    ? new Date(scheduledAt) <= new Date()
    : true; // If no date set, allow (edge case — contractor checked in without schedule)

  const canConfirm = statusAllows && dateHasPassed;

  if (!canConfirm) return null;

  async function confirm() {
    setLoading(true);
    await fetch(`/api/appointments/${appointmentId}/confirm`, { method: "POST" });
    router.refresh();
    setLoading(false);
  }

  return (
    <button type="button" className="btn-primary mt-3 text-sm" onClick={confirm} disabled={loading}>
      {loading ? "Confirming…" : "Confirm Appointment Occurred"}
    </button>
  );
}
