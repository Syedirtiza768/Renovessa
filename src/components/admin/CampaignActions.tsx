"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Campaign actions: send (draft), edit, clone, create follow-up. Send is a
 * deliberate, confirmed step because it's an outward-facing bulk action.
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
  filters: Record<string, string | number>;
  status: string;
}) {
  const router = useRouter();
  const [count, setCount] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [followUpTarget, setFollowUpTarget] = useState("");
  const [creatingFollowUp, setCreatingFollowUp] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  const isDraft = status === "draft" || status === "failed";
  const isSent = status === "sent";

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
      if (data.countMatchesExpected === false) {
        throw new Error(`Safety check failed: expected ${data.expectedCount} recipients but resolved ${data.count}.`);
      }
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

  async function clone() {
    setCloning(true);
    setError("");
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/clone`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to clone");
      router.push(`/portal/admin/campaigns/${data.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCloning(false);
    }
  }

  async function createFollowUp() {
    if (!followUpTarget) return;
    setCreatingFollowUp(true);
    setError("");
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: followUpTarget }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create follow-up");
      router.push(`/portal/admin/campaigns/${data.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreatingFollowUp(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Action buttons row */}
      <div className="flex flex-wrap gap-2">
        {isDraft && (
          <Link href={`/portal/admin/campaigns/${campaignId}/edit`} className="btn-secondary text-sm">
            Edit
          </Link>
        )}
        <button type="button" className="btn-secondary text-sm" onClick={clone} disabled={cloning}>
          {cloning ? "Cloning…" : "Clone"}
        </button>
        {isSent && (
          <div className="flex items-center gap-2">
            <select
              className="input w-auto text-sm"
              value={followUpTarget}
              onChange={(e) => setFollowUpTarget(e.target.value)}
            >
              <option value="">Create follow-up…</option>
              <option value="all">All recipients</option>
              <option value="not-replied">Didn&apos;t reply</option>
              <option value="not-opened">Didn&apos;t open</option>
              <option value="opened">Opened</option>
              <option value="replied">Replied</option>
            </select>
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={createFollowUp}
              disabled={!followUpTarget || creatingFollowUp}
            >
              {creatingFollowUp ? "Creating…" : "Go"}
            </button>
          </div>
        )}
      </div>

      {/* Send actions (draft only) */}
      {isDraft && (
        <div className="card p-4">
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
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
