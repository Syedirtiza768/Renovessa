"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  SERVICE_CATEGORIES,
  URGENCY_OPTIONS,
  BUDGET_RANGES,
  CONTACT_TIMES,
  DMV_ZIPS,
} from "@/lib/constants";
import { COMMUNICATION_CONSENT_TEXT, LEGAL_CLICKWRAP_TEXT } from "@/lib/compliance-versions";

export function ProjectRequestForm({ defaultTrade }: { defaultTrade?: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    trade: defaultTrade || "",
    description: "",
    urgency: URGENCY_OPTIONS[1],
    budgetRange: BUDGET_RANGES[2],
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    zipCode: "",
    preferredContact: CONTACT_TIMES[3],
    tcpaConsent: false,
    legalAccepted: false,
  });

  const update = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const zipValid = DMV_ZIPS.includes(form.zipCode) || form.zipCode.length === 5;

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/project-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          termsAccepted: form.legalAccepted,
          privacyAcknowledged: form.legalAccepted,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      router.push(`/thank-you?ref=${data.referenceNumber}&name=${encodeURIComponent(form.firstName)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id="project-form" className="card-accent p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate">Project Request</h2>
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-8 rounded-full ${step >= s ? "bg-copper" : "bg-rule"}`}
            />
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="label">Project Type</label>
            <select
              className="input"
              value={form.trade}
              onChange={(e) => update("trade", e.target.value)}
              required
            >
              <option value="">Select a category</option>
              {SERVICE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.label}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Project Description</label>
            <textarea
              className="input min-h-24"
              placeholder="Describe what you need done — the more detail, the better we can match you."
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              minLength={20}
              maxLength={500}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Urgency</label>
              <select className="input" value={form.urgency} onChange={(e) => update("urgency", e.target.value)}>
                {URGENCY_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Budget Range</label>
              <select className="input" value={form.budgetRange} onChange={(e) => update("budgetRange", e.target.value)}>
                {BUDGET_RANGES.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <button type="button" className="btn-primary w-full" onClick={() => setStep(2)} disabled={!form.trade || form.description.length < 20}>
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">First Name</label>
              <input className="input" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} required />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">ZIP Code</label>
              <input className="input" value={form.zipCode} onChange={(e) => update("zipCode", e.target.value)} maxLength={5} required />
              {form.zipCode.length === 5 && !DMV_ZIPS.includes(form.zipCode) && (
                <p className="mt-1 text-xs text-warning">Outside core DMV — we may still review your request.</p>
              )}
            </div>
            <div>
              <label className="label">Preferred Contact Time</label>
              <select className="input" value={form.preferredContact} onChange={(e) => update("preferredContact", e.target.value)}>
                {CONTACT_TIMES.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" className="btn-secondary flex-1" onClick={() => setStep(1)}>Back</button>
            <button type="button" className="btn-primary flex-1" onClick={() => setStep(3)} disabled={!form.firstName || !form.phone || !form.email || !zipValid}>
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.tcpaConsent}
              onChange={(e) => update("tcpaConsent", e.target.checked)}
              className="mt-1"
            />
            <span>
              {COMMUNICATION_CONSENT_TEXT} <a href="/tcpa" className="text-copper underline">See the disclosure</a>.
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.legalAccepted}
              onChange={(e) => update("legalAccepted", e.target.checked)}
              className="mt-1"
              required
            />
            <span>
              {LEGAL_CLICKWRAP_TEXT} <a href="/terms" className="text-copper underline">Terms</a> · <a href="/privacy" className="text-copper underline">Privacy</a>
            </span>
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-3">
            <button type="button" className="btn-secondary flex-1" onClick={() => setStep(2)}>Back</button>
            <button type="button" className="btn-primary flex-1" disabled={!form.legalAccepted || loading} onClick={submit}>
              {loading ? "Submitting..." : "Submit My Project Request"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
