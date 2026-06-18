"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface Contractor {
  id: string;
  companyName: string;
  trade: string;
  tier: string;
  status: string;
}

interface Props {
  appointmentId: string;
  appointmentStatus: string;
  currentContractorId: string;
  leadTrade: string;
}

const REASSIGNABLE_STATUSES = ["ACCEPTED", "SCHEDULED", "REMINDER_SENT", "CHECKED_IN"];

export function ReassignContractorPanel({
  appointmentId,
  appointmentStatus,
  currentContractorId,
  leadTrade,
}: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [contractorId, setContractorId] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!expanded) return;
    fetch("/api/contractors")
      .then((r) => r.json())
      .then((data: Contractor[]) => {
        if (!Array.isArray(data)) return;
        const eligible = data.filter(
          (c) =>
            c.id !== currentContractorId &&
            c.status === "active" &&
            c.tier !== "SUSPENDED" &&
            c.tier !== "BANNED" &&
            c.trade.toLowerCase() === leadTrade.toLowerCase()
        );
        setContractors(eligible);
      })
      .catch(() => {});
  }, [expanded, currentContractorId, leadTrade]);

  if (!REASSIGNABLE_STATUSES.includes(appointmentStatus)) return null;

  async function reassign() {
    if (!contractorId) {
      setError("Select a replacement contractor.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch(`/api/appointments/${appointmentId}/reassign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractorId, reason }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Reassignment failed");
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Reassign Contractor</h2>
        <button
          type="button"
          className="text-xs text-copper hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Cancel" : "Reassign"}
        </button>
      </div>

      {!expanded && (
        <p className="mt-2 text-sm text-muted">
          Replace the assigned contractor. The appointment will return to OFFERED status for the new contractor to accept.
        </p>
      )}

      {expanded && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted">Replacement Contractor</label>
            {contractors.length === 0 ? (
              <p className="mt-1 text-sm text-muted italic">
                No other eligible {leadTrade} contractors available.
              </p>
            ) : (
              <select
                className="input mt-1"
                value={contractorId}
                onChange={(e) => setContractorId(e.target.value)}
              >
                <option value="">— Select contractor —</option>
                {contractors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName} ({c.tier})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted">Reason for reassignment</label>
            <input
              className="input mt-1"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Contractor unavailable, conflict of interest"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            className="btn-primary w-full text-sm"
            onClick={reassign}
            disabled={loading || contractors.length === 0}
          >
            {loading ? "Reassigning…" : "Confirm Reassignment"}
          </button>
        </div>
      )}
    </div>
  );
}
