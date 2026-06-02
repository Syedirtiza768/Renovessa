"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AppointmentActions({ appointmentId, status }: { appointmentId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function action(type: "accept" | "checkin") {
    setLoading(true);
    await fetch(`/api/appointments/${appointmentId}/${type}`, { method: "POST" });
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="mt-4 flex gap-2">
      {status === "OFFERED" && (
        <button type="button" className="btn-primary text-sm" disabled={loading} onClick={() => action("accept")}>
          Accept Appointment
        </button>
      )}
      {(status === "ACCEPTED" || status === "SCHEDULED") && (
        <button type="button" className="btn-secondary text-sm" disabled={loading} onClick={() => action("checkin")}>
          Check In at Location
        </button>
      )}
    </div>
  );
}
