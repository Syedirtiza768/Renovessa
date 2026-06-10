"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface QualificationPanelProps {
  leadId: string;
  currentStatus: string;
  qualificationNotes: string | null;
  disposition: string | null;
  ownershipAuthority: string | null;
  reachable: boolean | null;
  invalidReason: string | null;
}

export function QualificationPanel({
  leadId,
  currentStatus,
  qualificationNotes,
  disposition,
  ownershipAuthority,
  reachable,
  invalidReason,
}: QualificationPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    qualificationNotes: qualificationNotes || "",
    disposition: disposition || "",
    ownershipAuthority: ownershipAuthority || "",
    reachable: reachable ?? false,
    invalidReason: invalidReason || "",
  });

  const update = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  async function save() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save");
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  async function qualify(status: "QUALIFIED" | "UNQUALIFIED") {
    if (status === "QUALIFIED" && !form.qualificationNotes.trim()) {
      setError("Add qualification notes before marking qualified.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, status }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to update");
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  const canQualify = currentStatus === "QUALIFICATION_IN_PROGRESS";

  return (
    <div className="card p-4">
      <h2 className="font-semibold">Qualification</h2>
      <div className="mt-4 space-y-4">
        <div>
          <label className="text-xs font-medium text-muted">Ownership</label>
          <select
            className="input mt-1"
            value={form.ownershipAuthority}
            onChange={(e) => update("ownershipAuthority", e.target.value)}
          >
            <option value="">— Select —</option>
            <option value="owner">Owner</option>
            <option value="renter">Renter</option>
            <option value="decision-maker">Decision-maker</option>
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.reachable}
              onChange={(e) => update("reachable", e.target.checked)}
              className="accent-accent"
            />
            Homeowner reachable
          </label>
        </div>

        <div>
          <label className="text-xs font-medium text-muted">Qualification Notes</label>
          <textarea
            className="input mt-1 min-h-[80px]"
            rows={3}
            placeholder="Project details confirmed, budget verified, ZIP in service area…"
            value={form.qualificationNotes}
            onChange={(e) => update("qualificationNotes", e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted">Disposition</label>
          <select
            className="input mt-1"
            value={form.disposition}
            onChange={(e) => update("disposition", e.target.value)}
          >
            <option value="">— Select —</option>
            <option value="hot">Hot — ready to schedule</option>
            <option value="warm">Warm — needs follow-up</option>
            <option value="cold">Cold — not ready</option>
            <option value="wrong_fit">Wrong fit</option>
          </select>
        </div>

        {!form.reachable && (
          <div>
            <label className="text-xs font-medium text-muted">Invalid Reason</label>
            <select
              className="input mt-1"
              value={form.invalidReason}
              onChange={(e) => update("invalidReason", e.target.value)}
            >
              <option value="">— Select —</option>
              <option value="unreachable">Unreachable after 3 attempts</option>
              <option value="wrong_trade">Wrong trade</option>
              <option value="out_of_area">Out of service area</option>
              <option value="duplicate">Duplicate request</option>
              <option value="spam">Spam / test</option>
            </select>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1 text-sm" onClick={save} disabled={loading}>
            Save Notes
          </button>
          {canQualify && (
            <>
              <button
                type="button"
                className="btn-primary flex-1 text-sm"
                onClick={() => qualify("QUALIFIED")}
                disabled={loading}
              >
                Mark Qualified
              </button>
              <button
                type="button"
                className="btn-secondary flex-1 text-sm"
                onClick={() => qualify("UNQUALIFIED")}
                disabled={loading}
              >
                Mark Unqualified
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
