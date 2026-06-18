"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  leadId: string;
  leadStatus: string;
  appointmentStatus: string | null;
}

export function NoShowPanel({ leadId, leadStatus, appointmentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Show only when lead is APPOINTMENT_COMPLETED and appointment is NO_SHOW
  const isNoShow =
    leadStatus === "APPOINTMENT_COMPLETED" && appointmentStatus === "NO_SHOW";

  if (!isNoShow) return null;

  async function setLeadStatus(status: "RECYCLE" | "CLOSED") {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to update lead");
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="card p-4 border-l-4 border-red-400">
      <h2 className="font-semibold text-red-700">No-Show Recorded</h2>
      <p className="mt-2 text-sm text-muted">
        The contractor did not attend this appointment. Choose how to proceed with this lead.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className="btn-primary flex-1 text-sm"
          disabled={loading}
          onClick={() => setLeadStatus("RECYCLE")}
        >
          {loading ? "Updating…" : "Recycle Lead (rebook)"}
        </button>
        <button
          type="button"
          className="btn-secondary flex-1 text-sm"
          disabled={loading}
          onClick={() => setLeadStatus("CLOSED")}
        >
          {loading ? "Updating…" : "Close Lead"}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        Recycle returns the lead to NEW for re-qualification and re-assignment. Close ends the lead permanently.
      </p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
