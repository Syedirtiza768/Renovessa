"use client";

import { useCallback, useEffect, useState } from "react";
import { CallButton } from "./CallButton";
import { EmailComposer } from "./EmailComposer";
import type { EmailContext } from "@/lib/emailTemplates";

interface CommunicationItem {
  id: string;
  type: "call" | "email";
  at: string;
  direction: string;
  toNumber?: string;
  status?: string;
  durationSeconds?: number | null;
  disposition?: string | null;
  dispositionNote?: string | null;
  subject?: string;
  toEmail?: string;
  agentName?: string | null;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Unified per-contact communication surface: a click-to-call button, a
 * template-aware email composer, and a merged call+email timeline — all bound
 * to one contact (homeowner or contractor) so agents always act in context.
 */
export function ContactCommunications({
  title,
  contactName,
  contactType,
  reference,
  phone,
  email,
  callLabel = "Call",
  projectRequestId,
  contractorId,
  emailContext,
}: {
  title: string;
  contactName: string;
  contactType: "homeowner" | "contractor";
  reference?: string;
  phone?: string | null;
  email?: string | null;
  callLabel?: string;
  projectRequestId?: string;
  contractorId?: string;
  emailContext: EmailContext;
}) {
  const [items, setItems] = useState<CommunicationItem[] | null>(null);

  const loadHistory = useCallback(async () => {
    const params = new URLSearchParams();
    if (projectRequestId) params.set("projectRequestId", projectRequestId);
    if (contractorId) params.set("contractorId", contractorId);
    try {
      const res = await fetch(`/api/communications?${params.toString()}`);
      if (res.ok) setItems(await res.json());
      else setItems([]);
    } catch {
      setItems([]);
    }
  }, [projectRequestId, contractorId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <button
          type="button"
          className="text-xs text-muted hover:text-foreground hover:underline"
          onClick={loadHistory}
        >
          Refresh
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {phone && (
          <CallButton
            toNumber={phone}
            label={callLabel}
            projectRequestId={projectRequestId}
            contractorId={contractorId}
            contactName={contactName}
            contactType={contactType}
            reference={reference}
          />
        )}
        {email && (
          <EmailComposer
            toEmail={email}
            projectRequestId={projectRequestId}
            contractorId={contractorId}
            audience={contactType}
            context={emailContext}
            onSent={loadHistory}
          />
        )}
        {!phone && !email && (
          <p className="text-xs text-muted">No phone or email on file for this contact.</p>
        )}
      </div>

      <div className="mt-5 border-t border-rule/50 pt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">History</p>
        {items === null ? (
          <p className="text-xs text-muted">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted">No calls or emails yet.</p>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {items.map((it) => (
              <li key={`${it.type}-${it.id}`} className="flex gap-2 text-sm">
                <span className="mt-0.5 shrink-0" aria-hidden>
                  {it.type === "call" ? "📞" : "✉️"}
                </span>
                <div className="min-w-0 flex-1">
                  {it.type === "call" ? (
                    <p className="truncate">
                      <span className="font-medium">
                        {it.disposition ? it.disposition.replace(/_/g, " ") : it.status}
                      </span>
                      {it.durationSeconds ? ` · ${it.durationSeconds}s` : ""}
                      {it.dispositionNote ? ` — ${it.dispositionNote}` : ""}
                    </p>
                  ) : (
                    <p className="truncate">
                      <span className="font-medium">{it.subject}</span>
                    </p>
                  )}
                  <p className="text-xs text-muted">
                    {formatWhen(it.at)}
                    {it.agentName ? ` · ${it.agentName}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
