"use client";

import { useEffect, useRef, useState } from "react";
import type { StepProps } from "../planner-types";
import { PermitsStep } from "./PermitsStep";
import { COMMUNICATION_CONSENT_TEXT, LEGAL_CLICKWRAP_TEXT } from "@/lib/compliance-versions";
import { deriveEstimateInputs } from "@/lib/bathroom/estimate-input-derivation";
import { getCanonical, hasLocation, resolveLocationId, isSupportedZip } from "@/lib/bathroom/answer-normalization";

type EstimateResult = {
  low: number;
  mid: number;
  high: number;
  confidence: { level: string; reasons: string[]; suggestions: string[] };
  lineItems: { category: string; description: string; low: number; mid: number; high: number }[];
  costDrivers?: string[];
  assumptions?: string[];
  unknowns?: string[];
  exclusions?: string[];
  scenarios?: { id: string; label: string; total: number; compromises: string[]; benefits: string[]; recommendedNextDecision?: string }[];
  locationId?: string;
  locationMissing?: boolean;
};

export function EstimateStep({ answers, setAnswer, flags, projectId, referenceNumber }: StepProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [showPermits, setShowPermits] = useState(false);
  const [showRfqForm, setShowRfqForm] = useState(false);
  const [estimatePersisted, setEstimatePersisted] = useState(false);
  const [persistFailed, setPersistFailed] = useState(false);
  const [briefId, setBriefId] = useState<string | null>(null);
  const [briefGenerating, setBriefGenerating] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);

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
  }, [answers, retryNonce]);

  // Persist the estimate to the project once both the preview result and the
  // server-side project draft exist. Retries automatically when projectId
  // arrives after the result (draft creation races the preview call).
  useEffect(() => {
    if (!result || !projectId || estimatePersisted || result.locationMissing) return;
    const ctrl = new AbortController();
    async function persist() {
      try {
        const inputs = deriveEstimateInputs(answers);
        const res = await fetch(`/api/bathroom-projects/${projectId}/estimates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(inputs),
          signal: ctrl.signal,
        });
        if (res.ok && !ctrl.signal.aborted) {
          setEstimatePersisted(true);
          setPersistFailed(false);
        } else if (!res.ok && !ctrl.signal.aborted) {
          setPersistFailed(true);
        }
      } catch {
        if (!ctrl.signal.aborted) {
          setPersistFailed(true);
        }
      }
    }
    void persist();
    return () => ctrl.abort();
  }, [result, projectId, answers, estimatePersisted]);

  // Auto-generate brief once estimate is successfully persisted.
  // Guarded by a ref (not state) so setting briefGenerating inside the
  // effect cannot retrigger it and abort its own in-flight fetch.
  const briefRequestedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!estimatePersisted || !projectId || briefId) return;
    if (briefRequestedForRef.current === projectId) return;
    briefRequestedForRef.current = projectId;
    const ctrl = new AbortController();
    async function autoBrief() {
      setBriefGenerating(true);
      setBriefError(null);
      try {
        const res = await fetch(`/api/bathroom-projects/${projectId}/brief`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ctrl.signal,
        });
        if (ctrl.signal.aborted) return;
        if (res.ok) {
          const data = (await res.json()) as { saved: { id: string } };
          setBriefId(data.saved.id);
        } else {
          const data = await res.json().catch(() => ({}));
          setBriefError((data as { error?: string }).error ?? `Brief generation failed (${res.status}). You can retry below.`);
        }
      } catch {
        if (!ctrl.signal.aborted) {
          setBriefError("Brief generation was interrupted. You can retry below.");
        }
      } finally {
        if (!ctrl.signal.aborted) setBriefGenerating(false);
      }
    }
    void autoBrief();
    return () => ctrl.abort();
  }, [estimatePersisted, projectId, briefId]);

  if (loading) {
    return <p className="text-sm text-ink-70">Calculating planning range…</p>;
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-700">We couldn&apos;t calculate your estimate. Your project answers are saved — nothing is lost.</p>
        <p className="text-xs text-ink-40">{error}</p>
        <button
          type="button"
          onClick={() => setRetryNonce((n) => n + 1)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bone-0 transition hover:opacity-90"
        >
          Retry estimate
        </button>
      </div>
    );
  }

  if (!result) return null;

  // Location missing state
  if (result.locationMissing) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-ink-100">Your planning results</h2>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-medium text-amber-900">Location needed for a planning range</p>
          <p className="mt-1 text-sm text-amber-800">
            Enter your project ZIP code on the Capture step to receive a localized estimate.
            Without a location, we cannot show a reliable planning range.
          </p>
        </div>
      </div>
    );
  }

  const locationDisplay = result.locationId === "rockville-md"
    ? "Rockville, MD"
    : result.locationId && result.locationId !== "unknown"
    ? result.locationId
    : "Location not verified";

  const submittedReference = answers.rfp_reference || null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-ink-100">Your planning results</h2>
          <p className="mt-1 text-sm text-ink-70">Illustrative planning range only — not a contractor quote.</p>
        </div>
        <EstimateStatusBadge estimatePersisted={estimatePersisted} persistFailed={persistFailed} projectId={projectId} />
      </div>

      {/* Location and range */}
      <div className="rounded-xl border border-ink-15 bg-bone-1 p-5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs uppercase tracking-wide text-ink-40">Planning range · {locationDisplay}</p>
          {result.locationId === "unknown" && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Location not in pilot area</span>
          )}
        </div>
        <p className="mt-1 font-serif-landing text-3xl text-ink-100">
          ${result.low.toLocaleString()} – ${result.high.toLocaleString()}
        </p>
        <p className="mt-1 text-sm text-ink-70">Mid estimate: ${result.mid.toLocaleString()}</p>
      </div>

      {/* Confidence */}
      <div className="rounded-lg border border-ink-15 p-4">
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

      {/* Cost categories — mobile cards, desktop table */}
      <div>
        <h3 className="text-sm font-semibold text-ink-100">Cost categories</h3>
        {/* Desktop table */}
        <div className="mt-2 hidden overflow-x-auto rounded-lg border border-ink-15 sm:block">
          <table className="w-full min-w-[420px] text-sm">
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
                  <td className="p-3">
                    <span className="font-medium">{li.category}</span>
                    <span className="block text-xs text-ink-40">{li.description}</span>
                  </td>
                  <td className="p-3">${li.low.toLocaleString()}</td>
                  <td className="p-3">${li.mid.toLocaleString()}</td>
                  <td className="p-3">${li.high.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile stacked cards */}
        <div className="mt-2 grid gap-3 sm:hidden">
          {result.lineItems.map((li) => (
            <div key={li.category} className="rounded-lg border border-ink-15 p-3">
              <p className="text-sm font-medium text-ink-100">{li.category}</p>
              <p className="text-xs text-ink-40">{li.description}</p>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-ink-70">Low: <span className="font-medium text-ink-100">${li.low.toLocaleString()}</span></span>
                <span className="text-ink-70">Mid: <span className="font-medium text-ink-100">${li.mid.toLocaleString()}</span></span>
                <span className="text-ink-70">High: <span className="font-medium text-ink-100">${li.high.toLocaleString()}</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cost drivers */}
      {result.costDrivers && result.costDrivers.length > 0 && (
        <div className="rounded-lg border border-ink-15 p-4">
          <h3 className="text-sm font-semibold text-ink-100">Cost drivers</h3>
          <ul className="mt-2 list-disc pl-5 text-sm text-ink-70">
            {result.costDrivers.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Assumptions & exclusions */}
      <div className="grid gap-4 sm:grid-cols-2">
        {result.assumptions && result.assumptions.length > 0 && (
          <div className="rounded-lg border border-ink-15 p-4">
            <h3 className="text-sm font-semibold text-ink-100">Assumptions</h3>
            <ul className="mt-2 list-disc pl-5 text-sm text-ink-70">
              {result.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        )}
        {result.exclusions && result.exclusions.length > 0 && (
          <div className="rounded-lg border border-ink-15 p-4">
            <h3 className="text-sm font-semibold text-ink-100">Exclusions</h3>
            <ul className="mt-2 list-disc pl-5 text-sm text-ink-70">
              {result.exclusions.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Budget scenarios */}
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
                {s.recommendedNextDecision && (
                  <p className="mt-2 text-xs font-medium text-accent">Next: {s.recommendedNextDecision}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Brief + RFP actions */}
      {flags.projectBrief && projectId && !submittedReference && (
        <div className="rounded-lg border border-accent bg-accent/5 p-5">
          <h3 className="font-semibold text-ink-100">Ready for the next step?</h3>
          {briefError && <p className="mt-2 text-sm text-red-700">{briefError}</p>}
          {!briefId && briefGenerating && (
            <div className="mt-2 flex items-center gap-2 text-xs text-ink-40">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent"></span>
              <span>Generating your project brief…</span>
            </div>
          )}
          {!briefId && !briefGenerating && !estimatePersisted && !persistFailed && (
            <div className="mt-2 flex items-center gap-2 text-xs text-ink-40">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent"></span>
              <span>Saving estimate to your project…</span>
            </div>
          )}
          {briefId && (
            <p className="mt-2 text-xs text-green-700">Project brief ready.</p>
          )}
          <div className="mt-3 flex flex-wrap gap-3">
            {briefId && (
              <>
                <a
                  href={`/api/bathroom-projects/${projectId}/brief/pdf`}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bone-0 transition hover:opacity-90"
                >
                  Download my project brief
                </a>
                <button
                  type="button"
                  onClick={() => setShowRfqForm(true)}
                  className="rounded-lg border border-accent px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/5"
                >
                  Request contractor proposals
                </button>
              </>
            )}
            {!briefId && !briefGenerating && (
              <button
                type="button"
                onClick={async () => {
                  setBriefGenerating(true);
                  setBriefError(null);
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
                    setBriefError(e instanceof Error ? e.message : "Unknown error");
                  } finally {
                    setBriefGenerating(false);
                  }
                }}
                disabled={!estimatePersisted || briefGenerating}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bone-0 transition hover:opacity-90 disabled:opacity-40"
              >
                {briefGenerating ? "Generating…" : !estimatePersisted ? "Saving estimate…" : "Generate my project brief"}
              </button>
            )}
          </div>
        </div>
      )}

      {submittedReference && (
        <RfpSuccessPanel referenceNumber={submittedReference} projectId={projectId} />
      )}

      {showRfqForm && !submittedReference && (
        <RfpContactForm
          projectId={projectId!}
          defaultZip={getCanonical(answers, "zipCode") || ""}
          onBack={() => setShowRfqForm(false)}
          onSubmitted={(ref) => setAnswer("rfp_reference", ref)}
        />
      )}

      {/* Permit guidance */}
      <div className="rounded-lg border border-ink-15 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-ink-100">Permit guidance</h3>
            <p className="mt-0.5 text-xs text-ink-40">
              Optional — flags likely permit categories. Not a legal determination.
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
    </div>
  );
}

function EstimateStatusBadge({ estimatePersisted, persistFailed, projectId }: { estimatePersisted: boolean; persistFailed: boolean; projectId: string | null }) {
  if (!projectId) {
    return (
      <span className="rounded-full border border-ink-15 bg-bone-1 px-2 py-0.5 text-xs text-ink-40">
        Waiting for project…
      </span>
    );
  }
  if (estimatePersisted) {
    return (
      <span className="rounded-full border border-green-300 bg-green-50 px-2 py-0.5 text-xs text-green-800">
        Estimate saved ✓
      </span>
    );
  }
  if (persistFailed) {
    return (
      <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
        Save failed — will retry
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-ink-15 bg-bone-1 px-2 py-0.5 text-xs text-ink-40">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent"></span>
      Saving estimate…
    </span>
  );
}

function RfpSuccessPanel({ referenceNumber, projectId }: { referenceNumber: string; projectId: string | null }) {
  return (
    <div className="rounded-lg border border-green-300 bg-green-50 p-5">
      <h3 className="font-semibold text-green-900">Your bathroom project has been submitted</h3>
      <p className="mt-1 text-sm text-green-800">
        RFP reference: <span className="font-mono font-semibold">{referenceNumber}</span>
      </p>
      <div className="mt-3 text-sm text-green-900">
        <p className="font-medium">What happens next</p>
        <ol className="mt-1 list-decimal space-y-1 pl-5">
          <li>Renovessa reviews your project brief.</li>
          <li>Suitable local bathroom contractors are identified.</li>
          <li>Contractors review your project scope and respond.</li>
          <li>You are notified when a contractor is interested — you stay in control of your contact details.</li>
        </ol>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {projectId && (
          <a
            href={`/api/bathroom-projects/${projectId}/brief/pdf`}
            className="rounded-lg border border-green-400 bg-white px-4 py-2 text-sm font-medium text-green-900 transition hover:bg-green-100"
          >
            Download project brief PDF
          </a>
        )}
      </div>
      <p className="mt-3 text-xs text-green-800">
        A confirmation email is on its way. Want to change something? Use the steps above to edit your project —
        your RFP keeps the brief you submitted.
      </p>
    </div>
  );
}

type RfpFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  zipCode: string;
  preferredContact: string;
  timeline: string;
  tcpaConsent: boolean;
  termsAccepted: boolean;
  privacyAcknowledged: boolean;
  maxContractors: number;
  notes: string;
};

function RfpContactForm({
  projectId,
  defaultZip,
  onBack,
  onSubmitted,
}: {
  projectId: string;
  defaultZip: string;
  onBack: () => void;
  onSubmitted: (referenceNumber: string) => void;
}) {
  const [form, setForm] = useState<RfpFormState>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    zipCode: defaultZip,
    preferredContact: "any",
    timeline: "",
    tcpaConsent: false,
    termsAccepted: false,
    privacyAcknowledged: false,
    maxContractors: 3,
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setField = <K extends keyof RfpFormState>(key: K, value: RfpFormState[K]) => {
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
      const res = await fetch(`/api/bathroom-projects/${projectId}/rfp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim() || undefined,
          email: form.email.trim(),
          phone: form.phone.replace(/\D/g, ""),
          zipCode: form.zipCode,
          preferredContact: form.preferredContact,
          timeline: form.timeline || undefined,
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
      onSubmitted(data.referenceNumber);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-accent bg-accent/5 p-5">
      <div>
        <h3 className="font-semibold text-ink-100">Request contractor proposals</h3>
        <p className="mt-1 text-sm text-ink-70">
          Your project brief is already built. We only need your contact details so contractors can reach you.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="rfp-first" className="text-xs font-medium text-ink-70">First name *</label>
          <input
            id="rfp-first"
            className="mt-1 w-full rounded-lg border border-ink-15 bg-bone-0 px-3 py-2 text-sm text-ink-100 outline-none focus:border-accent"
            value={form.firstName}
            onChange={(e) => setField("firstName", e.target.value)}
            autoComplete="given-name"
          />
          {errors.firstName && <p className="mt-0.5 text-xs text-red-700">{errors.firstName}</p>}
        </div>
        <div>
          <label htmlFor="rfp-last" className="text-xs font-medium text-ink-70">Last name</label>
          <input
            id="rfp-last"
            className="mt-1 w-full rounded-lg border border-ink-15 bg-bone-0 px-3 py-2 text-sm text-ink-100 outline-none focus:border-accent"
            value={form.lastName}
            onChange={(e) => setField("lastName", e.target.value)}
            autoComplete="family-name"
          />
        </div>
      </div>

      <div>
        <label htmlFor="rfp-email" className="text-xs font-medium text-ink-70">Email *</label>
        <input
          id="rfp-email"
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
          <label htmlFor="rfp-phone" className="text-xs font-medium text-ink-70">Mobile phone *</label>
          <input
            id="rfp-phone"
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
          <label htmlFor="rfp-zip" className="text-xs font-medium text-ink-70">Project ZIP code *</label>
          <input
            id="rfp-zip"
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="rfp-timeline" className="text-xs font-medium text-ink-70">When do you want to start?</label>
          <select
            id="rfp-timeline"
            className="mt-1 w-full rounded-lg border border-ink-15 bg-bone-0 px-3 py-2 text-sm text-ink-100 outline-none focus:border-accent"
            value={form.timeline}
            onChange={(e) => setField("timeline", e.target.value)}
          >
            <option value="">Flexible / not sure</option>
            <option value="ASAP">As soon as possible</option>
            <option value="Within 1 month">Within 1 month</option>
            <option value="1-3 months">1–3 months</option>
            <option value="3-6 months">3–6 months</option>
            <option value="Just planning">Just planning for now</option>
          </select>
        </div>
        <div>
          <label htmlFor="rfp-contact" className="text-xs font-medium text-ink-70">Preferred contact</label>
          <select
            id="rfp-contact"
            className="mt-1 w-full rounded-lg border border-ink-15 bg-bone-0 px-3 py-2 text-sm text-ink-100 outline-none focus:border-accent"
            value={form.preferredContact}
            onChange={(e) => setField("preferredContact", e.target.value)}
          >
            <option value="any">Any</option>
            <option value="phone">Phone call</option>
            <option value="text">Text message</option>
            <option value="email">Email</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="rfp-contractors" className="text-xs font-medium text-ink-70">
          How many contractors? ({form.maxContractors})
        </label>
        <div className="mt-1 flex gap-2">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setField("maxContractors", n)}
              className={`rounded-lg border px-3 py-1 text-sm ${
                form.maxContractors === n
                  ? "border-accent bg-accent text-bone-0"
                  : "border-ink-15 text-ink-70 hover:border-ink-40"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-ink-40">You control how many contractors receive your project brief.</p>
      </div>

      <div>
        <label htmlFor="rfp-notes" className="text-xs font-medium text-ink-70">Notes for contractors (optional)</label>
        <textarea
          id="rfp-notes"
          className="mt-1 w-full rounded-lg border border-ink-15 bg-bone-0 px-3 py-2 text-sm text-ink-100 outline-none focus:border-accent"
          rows={3}
          maxLength={4000}
          value={form.notes}
          onChange={(e) => setField("notes", e.target.value)}
          placeholder="Access constraints, HOA rules, preferred brands, must-have dates…"
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
          I acknowledge the Renovessa Privacy Policy and understand my project and contact information will be processed to coordinate this request.
        </span>
      </label>
      {errors.privacyAcknowledged && <p className="text-xs text-red-700">{errors.privacyAcknowledged}</p>}

      {submitError && (
        <p className="text-sm text-red-700">
          We couldn&apos;t submit your request — nothing has been lost. {submitError}
        </p>
      )}

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
          {submitting ? "Submitting…" : "Request my proposals →"}
        </button>
      </div>
    </form>
  );
}
