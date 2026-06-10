"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LEAD_STATUS_LABELS } from "@/lib/constants";

const STATUSES = [
  "NEW",
  "ASSIGNED",
  "CALLING",
  "QUALIFICATION_IN_PROGRESS",
  "QUALIFIED",
  "UNQUALIFIED",
  "APPOINTMENT_OFFERED",
  "APPOINTMENT_CONFIRMED",
  "APPOINTMENT_COMPLETED",
  "HOMEOWNER_CONFIRMED",
  "BILLING_PENDING",
  "BILLING_APPROVED",
  "DISPUTED",
  "CLOSED",
  "RECYCLE",
];

export function LeadActions({ leadId, currentStatus }: { leadId: string; currentStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function updateStatus() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to update");
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="card p-4">
      <h2 className="font-semibold">Admin Actions</h2>
      <div className="mt-4 space-y-3">
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STATUS_LABELS[s] || s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <button type="button" className="btn-primary w-full" onClick={updateStatus} disabled={loading}>
          {loading ? "Updating…" : "Update Status"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
