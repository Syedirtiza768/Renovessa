"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const CHANNELS = [
  { value: "call_attempted", label: "Call attempted" },
  { value: "call_completed", label: "Call completed" },
  { value: "voicemail", label: "Voicemail left" },
  { value: "sms", label: "SMS sent" },
  { value: "email", label: "Email sent" },
  { value: "note", label: "Internal note" },
];

export function CommunicationLogForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [channel, setChannel] = useState("call_attempted");
  const [outcome, setOutcome] = useState("");
  const [note, setNote] = useState("");

  async function submit() {
    setLoading(true);
    await fetch(`/api/leads/${leadId}/communications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, outcome, note }),
    });
    setOutcome("");
    setNote("");
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="card p-4">
      <h2 className="font-semibold">Log Communication</h2>
      <div className="mt-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-muted">Channel</label>
          <select className="input mt-1" value={channel} onChange={(e) => setChannel(e.target.value)}>
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Outcome</label>
          <select className="input mt-1" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
            <option value="">— Select —</option>
            <option value="answered">Answered</option>
            <option value="no_answer">No answer</option>
            <option value="busy">Busy</option>
            <option value="wrong_number">Wrong number</option>
            <option value="left_message">Left message</option>
            <option value="confirmed">Confirmed</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Notes</label>
          <textarea
            className="input mt-1"
            rows={2}
            placeholder="Details…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <button type="button" className="btn-primary w-full text-sm" onClick={submit} disabled={loading}>
          {loading ? "Logging…" : "Log Communication"}
        </button>
      </div>
    </div>
  );
}
