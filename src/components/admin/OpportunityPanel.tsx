"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface Contractor {
  id: string;
  companyName: string;
  trade: string;
}

export function OpportunityPanel({ leadId, currentStatus }: { leadId: string; currentStatus: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [contractorId, setContractorId] = useState("");
  const [manualSend, setManualSend] = useState(false);

  useEffect(() => {
    fetch("/api/contractors")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setContractors(data);
      })
      .catch(() => {});
  }, []);

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

  return (
    <div className="card-accent p-4">
      <h2 className="font-semibold">Send Opportunity</h2>
      <div className="mt-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-muted">Contractor</label>
          <select
            className="input mt-1"
            value={contractorId}
            onChange={(e) => setContractorId(e.target.value)}
          >
            <option value="">— Select contractor —</option>
            {contractors.map((c) => (
              <option key={c.id} value={c.id}>{c.companyName} ({c.trade})</option>
            ))}
          </select>
        </div>
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
          disabled={loading}
        >
          {loading ? "Sending…" : "Send Opportunity"}
        </button>
      </div>
    </div>
  );
}
