"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ScheduleAppointmentForm({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    scheduledAt: "",
    location: "",
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  async function schedule() {
    if (!form.scheduledAt || !form.location) {
      setError("Date/time and location are required.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch(`/api/appointments/${appointmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "schedule",
        scheduledAt: form.scheduledAt,
        location: form.location,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to schedule");
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="card p-4">
      <h2 className="font-semibold">Schedule Appointment</h2>
      <div className="mt-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-muted">Date & Time</label>
          <input
            type="datetime-local"
            className="input mt-1"
            value={form.scheduledAt}
            onChange={(e) => update("scheduledAt", e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Location</label>
          <input
            className="input mt-1"
            placeholder="1234 Main St, Fairfax, VA"
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="button" className="btn-primary w-full text-sm" onClick={schedule} disabled={loading}>
          {loading ? "Scheduling…" : "Schedule Appointment"}
        </button>
      </div>
    </div>
  );
}
