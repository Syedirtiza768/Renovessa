"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Draft-campaign actions: re-check the live recipient count, then send. Send is
 * a deliberate, confirmed step because it's an outward-facing bulk action. Once
 * a campaign is sent, this renders a read-only summary instead.
 */
export function CampaignActions({
  campaignId,
  audience,
  subject,
  bodyTemplate,
  filters,
  status,
}: {
  campaignId: string;
  audience: string;
  subject: string;
  bodyTemplate: string;
  filters: Record<string, string>;
  status: string;
}) {
  const router = useRouter();
  const [count, setCount] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  const isDraft = status === "draft" || status === "failed";

  async function checkCount() {
    setChecking(true);
    setError("");
    try {
      const res = await fetch("/api/campaigns/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience, filters, subject, bodyTemplate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resolve recipients");
      setCount(data.count);
      setConfirming(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setChecking(false);
    }
  }

  async function send() {
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send campaign");
      setResult({ sent: data.sent, failed: data.failed });
      setConfirming(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  if (!isDraft && !result) {
    return null;
  }

  return (
    <div className="mt-6 card p-4">
      {result ? (
        <p className="text-sm text-green-700">
          Sent to {result.sent} recipient{result.sent === 1 ? "" : "s"}
          {result.failed > 0 ? `, ${result.failed} failed` : ""}.
        </p>
      ) : !confirming ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">Ready to send. Re-check the recipient list first.</p>
          <button type="button" className="btn-primary text-sm" onClick={checkCount} disabled={checking}>
            {checking ? "Checking…" : "Review recipients & send"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm">
            This will email <span className="font-bold">{count}</span> recipient{count === 1 ? "" : "s"} now. This can&apos;t be undone.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary text-sm" onClick={send} disabled={sending || count === 0}>
              {sending ? "Sending…" : `Send to ${count}`}
            </button>
            <button type="button" className="text-sm text-muted hover:underline" onClick={() => setConfirming(false)} disabled={sending}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
