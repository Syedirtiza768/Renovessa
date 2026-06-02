"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STATUSES = [
  "NEW",
  "ASSIGNED",
  "QUALIFICATION_IN_PROGRESS",
  "QUALIFIED",
  "UNQUALIFIED",
  "SCHEDULING",
  "APPOINTMENT_CONFIRMED",
  "DISPUTED",
  "CLOSED",
];

export function LeadActions({ leadId, currentStatus }: { leadId: string; currentStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  async function updateStatus() {
    setLoading(true);
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="card p-4">
      <h2 className="font-semibold">Admin Actions</h2>
      <div className="mt-4 space-y-3">
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <button type="button" className="btn-primary w-full" onClick={updateStatus} disabled={loading}>
          Update Status
        </button>
      </div>
    </div>
  );
}
