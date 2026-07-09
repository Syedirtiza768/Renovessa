"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  EmailAudience,
  EmailContext,
  templatesForAudience,
  interpolateTemplate,
} from "@/lib/emailTemplates";

export function EmailComposer({
  toEmail,
  projectRequestId,
  contractorId,
  audience = "homeowner",
  context = {},
  onSent,
}: {
  toEmail: string;
  projectRequestId?: string;
  contractorId?: string;
  audience?: EmailAudience;
  context?: EmailContext;
  onSent?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const [agentName, setAgentName] = useState<string | undefined>(context.agentName);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const templates = useMemo(() => templatesForAudience(audience), [audience]);

  // Pull the agent's name once so {{agentName}} / the signature can fill in.
  useEffect(() => {
    if (context.agentName) return;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.name && setAgentName(d.name))
      .catch(() => {});
  }, [context.agentName]);

  function applyTemplate(id: string) {
    setTemplateId(id);
    setError("");
    setSent(false);
    const template = templates.find((t) => t.id === id);
    if (!template) {
      setSubject("");
      setMessage("");
      return;
    }
    const filled = interpolateTemplate(template, { ...context, agentName });
    setSubject(filled.subject);
    setMessage(filled.body);
  }

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
    setTemplateId("");
    setPreview(false);
    setSent(true);
    onSent?.();
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" className="btn-secondary text-sm" onClick={() => setOpen(true)}>
        ✉️ Email {toEmail}
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-rule p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">New email</p>
        <button
          type="button"
          className="text-muted hover:text-foreground"
          onClick={() => setOpen(false)}
          aria-label="Close composer"
        >
          ✕
        </button>
      </div>

      <div>
        <label className="text-xs font-medium text-muted">Template</label>
        <select
          className="input mt-1 text-sm"
          value={templateId}
          onChange={(e) => applyTemplate(e.target.value)}
        >
          <option value="">— Start from scratch —</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-muted">To</label>
        <input className="input mt-1 text-sm" value={toEmail} disabled />
      </div>

      {preview ? (
        <div className="rounded-md border border-rule bg-blueprint/40 p-3 text-sm">
          <p className="font-semibold">{subject || <span className="text-muted">(no subject)</span>}</p>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-foreground">{message}</pre>
        </div>
      ) : (
        <>
          <div>
            <label className="text-xs font-medium text-muted">Subject</label>
            <input
              className="input mt-1 text-sm"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Message</label>
            <textarea
              className="input mt-1 text-sm"
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {sent && <p className="text-sm text-green-700">Email sent.</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-primary text-sm" onClick={send} disabled={sending}>
          {sending ? "Sending…" : "Send"}
        </button>
        <button
          type="button"
          className="rounded border border-rule px-3 py-1.5 text-sm hover:bg-rule/30"
          onClick={() => setPreview((p) => !p)}
          disabled={!subject && !message}
        >
          {preview ? "Edit" : "Preview"}
        </button>
        <button type="button" className="text-sm text-muted hover:underline" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
