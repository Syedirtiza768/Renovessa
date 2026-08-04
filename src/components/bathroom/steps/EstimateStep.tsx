"use client";

import { useEffect, useState } from "react";
import type { StepProps } from "../planner-types";
import { PermitsStep } from "./PermitsStep";
import { COMMUNICATION_CONSENT_TEXT, LEGAL_CLICKWRAP_TEXT } from "@/lib/compliance-versions";
import { deriveEstimateInputs } from "@/lib/bathroom/estimate-input-derivation";

type EstimateResult = {
  low: number;
  mid: number;
  high: number;
  confidence: { level: string; reasons: string[]; suggestions: string[] };
  lineItems: { category: string; low: number; mid: number; high: number }[];
  scenarios?: { id: string; label: string; total: number; compromises: string[]; benefits: string[] }[];
};

export function EstimateStep({ answers, setAnswer, flags, projectId, referenceNumber }: StepProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPermits, setShowPermits] = useState(false);
  const [showRfqForm, setShowRfqForm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/bathroom-estimator/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
        });
        if (!res.ok) throw new Error(`Estimate failed (${res.status})`);
        const data = (await res.json()) as EstimateResult;
        if (!cancelled) setResult(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [answers]);

  useEffect(() => {
    if (!result || !projectId) return;
    const ctrl = new AbortController();
    async function persist() {
      try {
        const inputs = deriveEstimateInputs(answers);
        await fetch(`/api/bathroom-projects/${projectId}/estimates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(inputs),
          signal: ctrl.signal,
        });
      } catch {
        // Non-blocking: brief/RFQ will surface errors independently
      }
    }
    void persist();
    return () => ctrl.abort();
  }, [result, projectId, answers]);

  if (loading) {
    return <p className="text-sm text-ink-70">Calculating planning range…</p>;
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-700">We couldn&apos;t generate an estimate yet. {error}</p>
        <p className="text-xs text-ink-40">You can still continue and request a contractor bid with the answers you have.</p>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-100">Your planning results</h2>
        <p className="mt-1 text-sm text-ink-70">Illustrative planning range only — not a contractor quote. Permit questions are optional below.</p>
      </div>

      <div className="rounded-xl border border-ink-15 bg-bone-1 p-5">
        <p className="text-xs uppercase tracking-wide text-ink-40">Planning range</p>
        <p className="mt-1 font-serif-landing text-3xl text-ink-100">
          ${result.low.toLocaleString()} – ${result.high.toLocaleString()}
        </p>
        <p className="mt-1 text-sm text-ink-70">Mid estimate: ${result.mid.toLocaleString()}</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink-100">Confidence: {result.confidence.level}</h3>
        {result.confidence.reasons.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-sm text-ink-70">
            {result.confidence.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
        {result.confidence.suggestions.length > 0 && (
          <>
            <p className="mt-3 text-xs font-medium text-ink-40">To improve confidence:</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-ink-70">
              {result.confidence.suggestions.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink-100">Cost categories</h3>
        <div className="mt-2 overflow-hidden rounded-lg border border-ink-15">
          <table className="w-full text-sm">
            <thead className="bg-bone-1 text-left text-xs uppercase tracking-wide text-ink-40">
              <tr>
                <th className="p-3">Category</th>
                <th className="p-3">Low</th>
                <th className="p-3">Mid</th>
                <th className="p-3">High</th>
              </tr>
            </thead>
            <tbody>
              {result.lineItems.map((li) => (
                <tr key={li.category} className="border-t border-ink-15">
                  <td className="p-3">{li.category}</td>
                  <td className="p-3">${li.low.toLocaleString()}</td>
                  <td className="p-3">${li.mid.toLocaleString()}</td>
                  <td className="p-3">${li.high.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {result.scenarios && result.scenarios.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-ink-100">Budget scenarios</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {result.scenarios.map((s) => (
              <div key={s.id} className="rounded-lg border border-ink-15 p-4">
                <p className="font-semibold text-ink-100">{s.label}</p>
                <p className="mt-1 text-lg text-ink-100">${s.total.toLocaleString()}</p>
                {s.benefits.length > 0 && (
                  <p className="mt-2 text-xs text-ink-70">Benefits: {s.benefits.join(", ")}</p>
                )}
                {s.compromises.length > 0 && (
                  <p className="mt-1 text-xs text-ink-40">Trade-offs: {s.compromises.join(", ")}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {flags.projectBrief && projectId && (
        <BriefActions projectId={projectId} />
      )}

      <div className="rounded-lg border border-ink-15 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-ink-100">Permit guidance</h3>
            <p className="mt-0.5 text-xs text-ink-40">
              Optional — flags likely categories for Rockville / Montgomery County. Not a legal determination.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPermits((v) => !v)}
            className="text-sm font-medium text-accent"
          >
            {showPermits ? "Hide questions" : "Answer permit questions"}
          </button>
        </div>
        {showPermits && (
          <div className="mt-4 border-t border-ink-15 pt-4">
            <PermitsStep
              answers={answers}
              setAnswer={setAnswer}
              flags={flags}
              projectId={projectId}
              referenceNumber={referenceNumber}
            />
          </div>
        )}
      </div>

      {flags.contractorMatching && projectId && (
        <div className="rounded-lg border border-accent bg-accent/5 p-4">
          {showRfqForm ? (
            <BathroomRfqForm projectId={projectId} onBack={() => setShowRfqForm(false)} />
          ) : (
            <>
              <p className="text-sm font-medium text-ink-100">Ready to request contractor bids?</p>
              <p className="mt-1 text-xs text-ink-70">Submit your project details to request bids from reviewed Rockville-area bathroom contractors.</p>
              <button
                type="button"
                onClick={() => setShowRfqForm(true)}
                className="mt-2 inline-block text-sm font-medium text-accent"
              >
                Request contractor bids →
              </button>
            </>
          )}
        </div>
      )}

      {flags.contractorMatching && !projectId && (
        <div className="rounded-lg border border-ink-15 p-4">
          <p className="text-sm font-medium text-ink-100">Request contractor bids</p>
          <p className="mt-1 text-xs text-ink-70">Add a short description or room size on the Capture step so we can create your project, then return here to request contractor bids.</p>
        </div>
      )}
    </div>
  );
}

function BriefActions({ projectId }: { projectId: string }) {
  const [generating, setGenerating] = useState(false);
  const [briefId, setBriefId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateBrief = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/bathroom-projects/${projectId}/brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed (${res.status})`);
      }
      const data = (await res.json()) as { saved: { id: string } };
      setBriefId(data.saved.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="rounded-lg border border-ink-15 bg-bone-1 p-5">
      <h3 className="font-semibold text-ink-100">Project brief</h3>
      <p className="mt-1 text-sm text-ink-70">
        Generate a contractor-ready brief with your project details, planning estimate, and permit guidance.
        Then download it as a PDF to share with contractors.
      </p>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={generateBrief}
          disabled={generating}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bone-0 transition hover:opacity-90 disabled:opacity-40"
        >
          {generating ? "Generating…" : briefId ? "Regenerate brief" : "Generate brief"}
        </button>
        {briefId && (
          <a
            href={`/api/bathroom-projects/${projectId}/brief/pdf`}
            className="rounded-lg border border-ink-15 px-4 py-2 text-sm font-medium text-ink-70 transition hover:border-ink-40"
          >
            Download PDF →
          </a>
        )}
      </div>
    </div>
  );
}

type RfqFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  zipCode: string;
  preferredContact: string;
  tcpaConsent: boolean;
  termsAccepted: boolean;
  privacyAcknowledged: boolean;
  maxContractors: number;
  notes: string;
};

function BathroomRfqForm({ projectId, onBack }: { projectId: string; onBack: () => void }) {
  const [form, setForm] = useState<RfqFormState>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    zipCode: "",
    preferredContact: "any",
    tcpaConsent: false,
    termsAccepted: false,
    privacyAcknowledged: false,
    maxContractors: 3,
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ referenceNumber: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setField = <K extends keyof RfqFormState>(key: K, value: RfqFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next.firstName = "Required";
    if (!form.lastName.trim()) next.lastName = "Required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Enter a valid email.";
    if (!/^\d{10}$/.test(form.phone.replace(/\D/g, ""))) next.phone = "Enter a valid 10-digit US phone number.";
    if (!/^\d{5}$/.test(form.zipCode)) next.zipCode = "Enter a 5-digit ZIP code.";
    if (!form.termsAccepted) next.termsAccepted = "You must accept the Terms to continue.";
    if (!form.privacyAcknowledged) next.privacyAcknowledged = "You must acknowledge the Privacy Policy.";
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/bathroom-projects/${projectId}/rfq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.replace(/\D/g, ""),
          zipCode: form.zipCode,
          preferredContact: form.preferredContact,
          tcpaConsent: form.tcpaConsent,
          termsAccepted: true,
          privacyAcknowledged: true,
          maxContractors: form.maxContractors,
          notes: form.notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Submission failed (${res.status})`);
      }
      const data = (await res.json()) as { referenceNumber: string };
      setSubmitted(data);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-ink-100">RFQ submitted successfully</p>
        <p className="text-sm text-ink-70">
          Your reference number is <span className="font-mono font-semibold">{submitted.referenceNumber}</span>.
          We&apos;ll send a confirmation email and follow up with contractor matches.
        </p>
      </div>
    );
  }

  const phoneDigits = form.phone.replace(/\D/g, "");

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-sm font-medium text-ink-100">Request contractor bids</p>
        <p className="mt-0.5 text-xs text-ink-70">We&apos;ll use this to send your RFQ confirmation and follow up with bids from Rockville-area bathroom contractors.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="rfq-first" className="text-xs font-medium text-ink-70">First name *</label>
          <input
            id="rfq-first"
            className="mt-1 w-full rounded-lg border border-ink-15 bg-bone-0 px-3 py-2 text-sm text-ink-100 outline-none focus:border-accent"
            value={form.firstName}
            onChange={(e) => setField("firstName", e.target.value)}
            autoComplete="given-name"
          />
          {errors.firstName && <p className="mt-0.5 text-xs text-red-700">{errors.firstName}</p>}
        </div>
        <div>
          <label htmlFor="rfq-last" className="text-xs font-medium text-ink-70">Last name *</label>
          <input
            id="rfq-last"
            className="mt-1 w-full rounded-lg border border-ink-15 bg-bone-0 px-3 py-2 text-sm text-ink-100 outline-none focus:border-accent"
            value={form.lastName}
            onChange={(e) => setField("lastName", e.target.value)}
            autoComplete="family-name"
          />
          {errors.lastName && <p className="mt-0.5 text-xs text-red-700">{errors.lastName}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="rfq-email" className="text-xs font-medium text-ink-70">Email *</label>
        <input
          id="rfq-email"
          type="email"
          className="mt-1 w-full rounded-lg border border-ink-15 bg-bone-0 px-3 py-2 text-sm text-ink-100 outline-none focus:border-accent"
          value={form.email}
          onChange={(e) => setField("email", e.target.value)}
          autoComplete="email"
        />
        {errors.email && <p className="mt-0.5 text-xs text-red-700">{errors.email}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="rfq-phone" className="text-xs font-medium text-ink-70">Mobile phone *</label>
          <input
            id="rfq-phone"
            type="tel"
            className="mt-1 w-full rounded-lg border border-ink-15 bg-bone-0 px-3 py-2 text-sm text-ink-100 outline-none focus:border-accent"
            value={form.phone}
            onChange={(e) => setField("phone", e.target.value)}
            placeholder="(555) 555-5555"
            autoComplete="tel"
            inputMode="tel"
          />
          {errors.phone && <p className="mt-0.5 text-xs text-red-700">{errors.phone}</p>}
        </div>
        <div>
          <label htmlFor="rfq-zip" className="text-xs font-medium text-ink-70">ZIP code *</label>
          <input
            id="rfq-zip"
            className="mt-1 w-full rounded-lg border border-ink-15 bg-bone-0 px-3 py-2 text-sm text-ink-100 outline-none focus:border-accent"
            value={form.zipCode}
            onChange={(e) => setField("zipCode", e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="20850"
            inputMode="numeric"
            maxLength={5}
            autoComplete="postal-code"
          />
          {errors.zipCode && <p className="mt-0.5 text-xs text-red-700">{errors.zipCode}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="rfq-window" className="text-xs font-medium text-ink-70">Best time to reach you</label>
        <select
          id="rfq-window"
          className="mt-1 w-full rounded-lg border border-ink-15 bg-bone-0 px-3 py-2 text-sm text-ink-100 outline-none focus:border-accent"
          value={form.preferredContact}
          onChange={(e) => setField("preferredContact", e.target.value)}
        >
          <option value="any">Any time</option>
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
          <option value="evening">Evening</option>
        </select>
      </div>

      <div>
        <label htmlFor="rfq-contractors" className="text-xs font-medium text-ink-70">
          Max contractors to match ({form.maxContractors})
        </label>
        <input
          id="rfq-contractors"
          type="range"
          min={1}
          max={5}
          className="mt-1 w-full"
          value={form.maxContractors}
          onChange={(e) => setField("maxContractors", Number(e.target.value))}
        />
      </div>

      <div>
        <label htmlFor="rfq-notes" className="text-xs font-medium text-ink-70">Notes (optional)</label>
        <textarea
          id="rfq-notes"
          className="mt-1 w-full rounded-lg border border-ink-15 bg-bone-0 px-3 py-2 text-sm text-ink-100 outline-none focus:border-accent"
          rows={3}
          maxLength={4000}
          value={form.notes}
          onChange={(e) => setField("notes", e.target.value)}
          placeholder="Anything else contractors should know — access constraints, HOA rules, preferred brands, must-have dates…"
        />
      </div>

      <label className="flex items-start gap-3 text-sm text-ink-70">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0"
          checked={form.tcpaConsent}
          onChange={(e) => setField("tcpaConsent", e.target.checked)}
        />
        <span className="text-xs">
          {COMMUNICATION_CONSENT_TEXT}
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm text-ink-70">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0"
          checked={form.termsAccepted}
          onChange={(e) => setField("termsAccepted", e.target.checked)}
        />
        <span className="text-xs">
          {LEGAL_CLICKWRAP_TEXT}{" "}
          <a href="/terms" className="text-accent underline" target="_blank" rel="noopener noreferrer">Terms</a>{" "}
          ·{" "}
          <a href="/privacy" className="text-accent underline" target="_blank" rel="noopener noreferrer">Privacy</a>
        </span>
      </label>
      {errors.termsAccepted && <p className="text-xs text-red-700">{errors.termsAccepted}</p>}

      <label className="flex items-start gap-3 text-sm text-ink-70">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0"
          checked={form.privacyAcknowledged}
          onChange={(e) => setField("privacyAcknowledged", e.target.checked)}
        />
        <span className="text-xs">
          I acknowledge the Renovessa Privacy Policy and understand my project and contact information will be processed to coordinate this RFQ.
        </span>
      </label>
      {errors.privacyAcknowledged && <p className="text-xs text-red-700">{errors.privacyAcknowledged}</p>}

      {submitError && <p className="text-sm text-red-700">{submitError}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-ink-15 px-4 py-2 text-sm text-ink-70 transition hover:border-ink-40"
        >
          ← Back
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bone-0 transition hover:opacity-90 disabled:opacity-40"
        >
          {submitting ? "Submitting…" : "Submit RFQ →"}
        </button>
      </div>
    </form>
  );
}
