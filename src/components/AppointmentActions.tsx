"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  appointmentId: string;
  status: string;
}

export function AppointmentActions({ appointmentId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDecline, setShowDecline] = useState(false);
  const [showOutcome, setShowOutcome] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [estimateGiven, setEstimateGiven] = useState("");
  const [contractorOutcomeNotes, setContractorOutcomeNotes] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [error, setError] = useState("");

  async function action(type: "accept" | "checkin") {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/appointments/${appointmentId}/${type}`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Action failed");
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  async function decline() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/appointments/${appointmentId}/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: declineReason }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Decline failed");
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  async function recordOutcome(noShow: boolean) {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/appointments/${appointmentId}/outcome`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        noShow,
        estimateGiven: estimateGiven || undefined,
        contractorOutcomeNotes: contractorOutcomeNotes || undefined,
        followUpRequired,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to record outcome");
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="mt-4 space-y-2">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {status === "OFFERED" && (
          <>
            <button type="button" className="btn-primary text-sm" disabled={loading} onClick={() => action("accept")}>
              Accept Appointment
            </button>
            <button
              type="button"
              className="btn-secondary text-sm"
              disabled={loading}
              onClick={() => setShowDecline((v) => !v)}
            >
              Decline
            </button>
          </>
        )}
        {(status === "SCHEDULED" || status === "REMINDER_SENT") && (
          <button type="button" className="btn-secondary text-sm" disabled={loading} onClick={() => action("checkin")}>
            Check In at Location
          </button>
        )}
        {status === "CHECKED_IN" && (
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={loading}
            onClick={() => setShowOutcome((v) => !v)}
          >
            {showOutcome ? "Cancel" : "Record Outcome"}
          </button>
        )}
      </div>

      {showDecline && status === "OFFERED" && (
        <div className="rounded border border-rule bg-blueprint p-3 space-y-2">
          <label className="text-xs font-medium text-muted">Reason for declining (optional)</label>
          <input
            className="input text-sm"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="e.g. Booked out, wrong trade"
          />
          <div className="flex gap-2">
            <button type="button" className="btn-primary text-sm" disabled={loading} onClick={decline}>
              Confirm Decline
            </button>
            <button type="button" className="btn-secondary text-sm" onClick={() => setShowDecline(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {showOutcome && status === "CHECKED_IN" && (
        <div className="rounded border border-rule bg-blueprint p-4 space-y-3">
          <p className="text-sm font-semibold">Appointment Outcome</p>

          <div>
            <label className="text-xs font-medium text-muted">Estimate given to homeowner</label>
            <input
              className="input mt-1 text-sm"
              value={estimateGiven}
              onChange={(e) => setEstimateGiven(e.target.value)}
              placeholder="e.g. $800–$1,200 for full HVAC service"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted">Notes from appointment</label>
            <textarea
              className="input mt-1 text-sm"
              rows={3}
              value={contractorOutcomeNotes}
              onChange={(e) => setContractorOutcomeNotes(e.target.value)}
              placeholder="What happened at the appointment? Any issues?"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={followUpRequired}
              onChange={(e) => setFollowUpRequired(e.target.checked)}
              className="accent-accent"
            />
            Follow-up appointment required
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              className="btn-primary flex-1 text-sm"
              disabled={loading}
              onClick={() => recordOutcome(false)}
            >
              {loading ? "Saving…" : "Mark Completed"}
            </button>
            <button
              type="button"
              className="btn-secondary flex-1 text-sm"
              disabled={loading}
              onClick={() => recordOutcome(true)}
            >
              {loading ? "Saving…" : "Record No-Show"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
