"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BillingProofPanel({ invoiceId, status }: { invoiceId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [waivedReason, setWaivedReason] = useState("");

  async function approve() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/billing/proof/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to approve");
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  async function waive() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/billing/proof/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "waive", waivedReason }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to waive");
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="card p-4">
      <h2 className="font-semibold">Pilot Billing Proof</h2>
      <p className="mt-2 text-sm text-muted">Invoice status: {status}</p>
      {status === "PENDING" && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted">Waived Reason (if waiving)</label>
            <input className="input mt-1" value={waivedReason} onChange={(e) => setWaivedReason(e.target.value)} placeholder="e.g. $0 pilot, waived" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn-primary flex-1 text-sm" onClick={approve} disabled={loading}>
              Approve
            </button>
            <button type="button" className="btn-secondary flex-1 text-sm" onClick={waive} disabled={loading}>
              Waive
            </button>
          </div>
        </div>
      )}
      {status !== "PENDING" && (
        <p className="mt-2 text-sm text-green-700">Invoice {status.toLowerCase()}</p>
      )}
    </div>
  );
}
