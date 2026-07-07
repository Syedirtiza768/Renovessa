"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EmailComposer({
  toEmail,
  projectRequestId,
  contractorId,
}: {
  toEmail: string;
  projectRequestId?: string;
  contractorId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function send() {
    if (!subject || !message) {
      setError("Subject and message are required.");
      return;
    }
    setSending(true);
    setError("");
    const res = await fetch("/api/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: toEmail, subject, message, projectRequestId, contractorId }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setError(data.error || "Failed to send email");
      return;
    }
    setSubject("");
    setMessage("");
    setSent(true);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" className="btn-secondary text-sm" onClick={() => setOpen(true)}>
        Email {toEmail}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted">To</label>
        <input className="input mt-1" value={toEmail} disabled />
      </div>
      <div>
        <label className="text-xs font-medium text-muted">Subject</label>
        <input className="input mt-1" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-medium text-muted">Message</label>
        <textarea className="input mt-1" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {sent && <p className="text-sm text-green-700">Email sent.</p>}
      <div className="flex gap-2">
        <button type="button" className="btn-primary text-sm" onClick={send} disabled={sending}>
          {sending ? "Sending…" : "Send"}
        </button>
        <button type="button" className="text-sm text-muted hover:underline" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
