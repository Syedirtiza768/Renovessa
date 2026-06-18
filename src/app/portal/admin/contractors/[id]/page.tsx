"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, use } from "react";

interface ContractorProfile {
  id: string;
  companyName: string;
  trade: string;
  tier: string;
  status: string;
  licenseVerified: boolean;
  insuranceVerified: boolean;
  yearsInBusiness: number | null;
  employeeCount: number | null;
  serviceZips: string[];
  contactPerson: string | null;
  availabilityNotes: string | null;
  pilotTerms: string | null;
  firstAppointmentPricing: string | null;
  pilotPriceAmount: number | null;
  responseTimeHours: number | null;
  googleBusinessUrl: string | null;
  internalNotes: string | null;
}

export default function ContractorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{ email: string; tempPassword: string } | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    fetch(`/api/contractors/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setForm(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load contractor");
        setLoading(false);
      });
  }, [id]);

  const update = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  async function resetPassword() {
    setResetting(true);
    setResetResult(null);
    const res = await fetch(`/api/contractors/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset-password" }),
    });
    if (res.ok) {
      setResetResult(await res.json());
    }
    setResetting(false);
  }

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/contractors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        serviceZips: typeof form.serviceZips === "string"
          ? form.serviceZips.split(",").map((z: string) => z.trim()).filter(Boolean)
          : form.serviceZips,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save");
    } else {
      router.refresh();
    }
    setSaving(false);
  }

  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">{form.companyName || "Contractor"}</h1>
      <div className="mt-6 card p-4 max-w-2xl">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted">Company Name</label>
              <input className="input mt-1" value={form.companyName || ""} onChange={(e) => update("companyName", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Trade</label>
              <input className="input mt-1" value={form.trade || ""} onChange={(e) => update("trade", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Tier</label>
              <select className="input mt-1" value={form.tier || "TRIAL"} onChange={(e) => update("tier", e.target.value)}>
                {["TRIAL", "STANDARD", "PREFERRED", "WATCH", "SUSPENDED", "BANNED"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Status</label>
              <select className="input mt-1" value={form.status || "active"} onChange={(e) => update("status", e.target.value)}>
                {["active", "inactive", "probation"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Contact Person</label>
              <input className="input mt-1" value={form.contactPerson || ""} onChange={(e) => update("contactPerson", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Response SLA (hours)</label>
              <input type="number" className="input mt-1" value={form.responseTimeHours || ""} onChange={(e) => update("responseTimeHours", e.target.value ? parseInt(e.target.value) : null)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted">Service ZIPs</label>
            <input className="input mt-1" value={Array.isArray(form.serviceZips) ? form.serviceZips.join(", ") : form.serviceZips || ""} onChange={(e) => update("serviceZips", e.target.value)} />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.licenseVerified || false} onChange={(e) => update("licenseVerified", e.target.checked)} className="accent-accent" />
              License Verified
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.insuranceVerified || false} onChange={(e) => update("insuranceVerified", e.target.checked)} className="accent-accent" />
              Insurance Verified
            </label>
          </div>

          <div>
            <label className="text-xs font-medium text-muted">Pilot Terms</label>
            <textarea className="input mt-1" rows={2} value={form.pilotTerms || ""} onChange={(e) => update("pilotTerms", e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-medium text-muted">Availability Notes</label>
            <textarea className="input mt-1" rows={2} value={form.availabilityNotes || ""} onChange={(e) => update("availabilityNotes", e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-medium text-muted">Internal Notes</label>
            <textarea className="input mt-1" rows={2} value={form.internalNotes || ""} onChange={(e) => update("internalNotes", e.target.value)} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="button" className="btn-primary w-full" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>

          <div className="border-t border-rule pt-4">
            <p className="text-xs font-medium text-muted mb-2">Portal Access</p>
            <button
              type="button"
              className="btn-secondary w-full text-sm"
              onClick={resetPassword}
              disabled={resetting}
            >
              {resetting ? "Resetting…" : "Reset Contractor Password"}
            </button>
            {resetResult && (
              <div className="mt-3 rounded border border-rule bg-blueprint p-3 text-sm space-y-1">
                <p className="font-medium">New temporary password:</p>
                <p><span className="text-muted">Email:</span> <span className="font-mono">{resetResult.email}</span></p>
                <p><span className="text-muted">Password:</span> <span className="font-mono tracking-widest">{resetResult.tempPassword}</span></p>
                <p className="text-xs text-muted">Share this with the contractor — shown once.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
