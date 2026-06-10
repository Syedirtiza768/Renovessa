"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const VALID_STATUSES = ["SCHEDULED", "REMINDER_SENT", "CHECKED_IN", "COMPLETED", "HOMEOWNER_CONFIRMED"];

export function ConfirmAppointmentButton({ appointmentId, appointmentStatus }: { appointmentId: string; appointmentStatus: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const canConfirm = VALID_STATUSES.includes(appointmentStatus);

  async function confirm() {
    setLoading(true);
    await fetch(`/api/appointments/${appointmentId}/confirm`, { method: "POST" });
    router.refresh();
    setLoading(false);
  }

  if (!canConfirm) return null;

  return (
    <button type="button" className="btn-primary mt-3 text-sm" onClick={confirm} disabled={loading}>
      {loading ? "Confirming…" : "Confirm Appointment Occurred"}
    </button>
  );
}
