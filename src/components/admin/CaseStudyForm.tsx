"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface ExistingCaseStudyData {
  id: string;
  trade: string;
  zipCode: string;
  leadSource: string | null;
  homeownerConfirmed: boolean;
  contractorAttended: boolean;
  estimateGiven: string | null;
  disputeOccurred: boolean;
  lessonsLearned: string | null;
  nextImprovement: string | null;
  status: string;
}

type ExistingCaseStudy = ExistingCaseStudyData | null;

export function CaseStudyForm({ projectRequestId, existing }: { projectRequestId: string; existing: ExistingCaseStudy }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    trade: existing?.trade || "",
    zipCode: existing?.zipCode || "",
    leadSource: existing?.leadSource || "",
    homeownerConfirmed: existing?.homeownerConfirmed || false,
    contractorAttended: existing?.contractorAttended || false,
    estimateGiven: existing?.estimateGiven || "",
    disputeOccurred: existing?.disputeOccurred || false,
    lessonsLearned: existing?.lessonsLearned || "",
    nextImprovement: existing?.nextImprovement || "",
  });

  const update = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  async function submit() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/case-studies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectRequestId, ...form }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save case study");
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="card p-4">
      <h2 className="font-semibold">Case Study {existing ? "(Draft)" : ""}</h2>
      <div className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted">Trade</label>
            <input className="input mt-1" value={form.trade} onChange={(e) => update("trade", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">ZIP Code</label>
            <input className="input mt-1" value={form.zipCode} onChange={(e) => update("zipCode", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Lead Source</label>
            <input className="input mt-1" value={form.leadSource} onChange={(e) => update("leadSource", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Estimate Given</label>
            <select className="input mt-1" value={form.estimateGiven} onChange={(e) => update("estimateGiven", e.target.value)}>
              <option value="">— Select —</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.homeownerConfirmed} onChange={(e) => update("homeownerConfirmed", e.target.checked)} className="accent-accent" />
            Homeowner Confirmed
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.contractorAttended} onChange={(e) => update("contractorAttended", e.target.checked)} className="accent-accent" />
            Contractor Attended
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.disputeOccurred} onChange={(e) => update("disputeOccurred", e.target.checked)} className="accent-accent" />
            Dispute Occurred
          </label>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Lessons Learned</label>
          <textarea className="input mt-1" rows={3} value={form.lessonsLearned} onChange={(e) => update("lessonsLearned", e.target.value)} placeholder="What went well, what could improve…" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Next Improvement</label>
          <textarea className="input mt-1" rows={2} value={form.nextImprovement} onChange={(e) => update("nextImprovement", e.target.value)} placeholder="Action items for next pilot…" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="button" className="btn-primary w-full text-sm" onClick={submit} disabled={loading}>
          {loading ? "Saving…" : existing ? "Update Case Study" : "Save Case Study Draft"}
        </button>
      </div>
    </div>
  );
}
