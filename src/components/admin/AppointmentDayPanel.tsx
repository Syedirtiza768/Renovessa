"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface AppointmentDayPanelProps {
  appointmentId: string;
  status: string;
}

export function AppointmentDayPanel({ appointmentId, status }: AppointmentDayPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    estimateGiven: "",
    contractorOutcomeNotes: "",
    followUpRequired: false,
  });

  const update = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  async function markReminderSent() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/appointments/${appointmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_reminder_sent" }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed");
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
        estimateGiven: form.estimateGiven || undefined,
        contractorOutcomeNotes: form.contractorOutcomeNotes || undefined,
        followUpRequired: form.followUpRequired,
        noShow,
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
    <div className="card p-4">
      <h2 className="font-semibold">Appointment Day Control</h2>
      <div className="mt-4 space-y-4">
        {["SCHEDULED", "REMINDER_SENT"].includes(status) && (
          <button type="button" className="btn-secondary w-full text-sm" onClick={markReminderSent} disabled={loading}>
            Mark Reminder Sent
          </button>
        )}

        <div>
          <label className="text-xs font-medium text-muted">Estimate Given</label>
          <select className="input mt-1" value={form.estimateGiven} onChange={(e) => update("estimateGiven", e.target.value)}>
            <option value="">— Select —</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted">Contractor Outcome Notes</label>
          <textarea
            className="input mt-1"
            rows={3}
            placeholder="What happened at the appointment…"
            value={form.contractorOutcomeNotes}
            onChange={(e) => update("contractorOutcomeNotes", e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.followUpRequired} onChange={(e) => update("followUpRequired", e.target.checked)} className="accent-accent" />
          Follow-up required
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button type="button" className="btn-primary flex-1 text-sm" onClick={() => recordOutcome(false)} disabled={loading}>
            Record Completion
          </button>
          <button type="button" className="btn-secondary flex-1 text-sm" onClick={() => recordOutcome(true)} disabled={loading}>
            Mark No-Show
          </button>
        </div>
      </div>
    </div>
  );
}
