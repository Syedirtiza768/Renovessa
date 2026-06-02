"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ConfirmAppointmentButton({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    await fetch(`/api/appointments/${appointmentId}/confirm`, { method: "POST" });
    router.refresh();
    setLoading(false);
  }

  return (
    <button type="button" className="btn-primary mt-3 text-sm" onClick={confirm} disabled={loading}>
      {loading ? "Confirming..." : "Confirm Appointment Occurred"}
    </button>
  );
}
