"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface Contractor {
  id: string;
  companyName: string;
  trade: string;
  tier: string;
  status: string;
  responseTimeHours: number | null;
}

interface AuditEvent {
  id: string;
  eventType: string;
  description: string;
  createdAt: string;
  metadata: Record<string, any> | null;
}

interface Props {
  leadId: string;
  currentStatus: string;
  leadTrade: string;
  offerHistory?: AuditEvent[];
}

export function OpportunityPanel({ leadId, currentStatus, leadTrade, offerHistory = [] }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [contractorId, setContractorId] = useState("");
  const [manualSend, setManualSend] = useState(false);

  useEffect(() => {
    fetch("/api/contractors")
      .then((r) => r.json())
      .then((data: Contractor[]) => {
        if (!Array.isArray(data)) return;
        // Filter to active, non-suspended/banned contractors matching the lead trade.
        const eligible = data.filter(
          (c) =>
            c.status === "active" &&
            c.tier !== "SUSPENDED" &&
            c.tier !== "BANNED" &&
            c.trade.toLowerCase() === leadTrade.toLowerCase()
        );
        setContractors(eligible);
      })
      .catch(() => {});
  }, [leadTrade]);

  const selectedContractor = contractors.find((c) => c.id === contractorId);
  const slaDeadline =
    selectedContractor?.responseTimeHours
      ? new Date(Date.now() + selectedContractor.responseTimeHours * 60 * 60 * 1000).toLocaleString()
      : null;

  async function sendOpportunity() {
    if (!contractorId) {
      setError("Select a contractor.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectRequestId: leadId,
        contractorId,
        notes: manualSend ? "Sent via WhatsApp manually" : undefined,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to send opportunity");
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  if (currentStatus !== "QUALIFIED") return null;

  const prevOffers = offerHistory.filter(
    (e) => e.eventType === "CONTRACTOR_OFFERED" || e.eventType === "CONTRACTOR_DECLINED"
  );

  return (
    <div className="card-accent p-4">
      <h2 className="font-semibold">Send Opportunity</h2>

      {prevOffers.length > 0 && (
        <div className="mt-3 rounded-md border border-rule bg-blueprint p-3">
          <p className="text-xs font-semibold uppercase text-muted mb-2">Previous Offers</p>
          <ul className="space-y-1.5">
            {prevOffers.map((e) => (
              <li key={e.id} className="text-xs text-muted">
                <span className={e.eventType === "CONTRACTOR_DECLINED" ? "text-red-600 font-medium" : "text-copper font-medium"}>
                  {e.eventType === "CONTRACTOR_DECLINED" ? "Declined" : "Offered"}
                </span>
                {" — "}
                {e.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-muted">Contractor</label>
          {contractors.length === 0 ? (
            <p className="mt-1 text-sm text-muted italic">
              No eligible {leadTrade} contractors available. Check contractor trade assignments and status.
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
                  {c.companyName} · {c.tier}
                  {c.responseTimeHours ? ` · responds in ${c.responseTimeHours}h` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {slaDeadline && (
          <p className="text-xs text-muted">
            Expected response by: <span className="font-medium text-slate">{slaDeadline}</span>
          </p>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={manualSend}
            onChange={(e) => setManualSend(e.target.checked)}
            className="accent-accent"
          />
          Sent via WhatsApp manually
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          className="btn-primary w-full text-sm"
          onClick={sendOpportunity}
          disabled={loading || contractors.length === 0}
        >
          {loading ? "Sending…" : "Send Opportunity"}
        </button>
      </div>
    </div>
  );
}
