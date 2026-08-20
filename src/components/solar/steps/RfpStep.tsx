"use client";

/**
 * Request installer proposals (§45).
 *
 * Before anything is submitted the homeowner sees exactly what will be shared,
 * chooses how many installers may receive it, and gives affirmative (never
 * pre-checked) communication consent. Consent evidence is recorded server-side
 * through the existing compliance machinery.
 */

import { useState } from "react";
import Link from "next/link";
import type { PlanPayload } from "../planner-types";
import { formatKw, formatKwhPerYear } from "@/lib/solar/formatters";
import {
  EstimatorContactFields,
  validateEstimatorContact,
  type EstimatorContactState,
} from "@/components/estimator/EstimatorContactFields";

export function RfpStep({
  projectId,
  defaultZip,
  plan,
  onBack,
}: {
  projectId: string;
  defaultZip: string;
  plan: PlanPayload | null;
  onBack: () => void;
}) {
  const [form, setForm] = useState<EstimatorContactState>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    zipCode: defaultZip,
    timeline: "",
    preferredContact: "any",
    maxContractors: 3,
    notes: "",
    tcpaConsent: false,
    termsAccepted: false,
    privacyAcknowledged: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ referenceNumber: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validateEstimatorContact(form);
    if (Object.keys(validation).length > 0) {
      setError(Object.values(validation)[0]);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/solar-projects/${projectId}/rfp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "We couldn't submit your request.");
        return;
      }
      setResult({ referenceNumber: data.referenceNumber });
    } catch {
      // Submission is idempotent server-side, so retrying is safe.
      setError("We couldn't reach the server. Your answers are saved — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-ink-100">Your request is in</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-70">
          Reference <span className="font-mono-landing">{result.referenceNumber}</span>. We&rsquo;ve emailed you a
          copy. Renovessa reviews the project and matches it with qualified installers — your details are not blasted
          out automatically.
        </p>
        <Link href="/solar" className="landing-btn-primary mt-6 inline-flex">
          Back to solar
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-ink-100">Request installer proposals</h2>

      <section className="mt-5 rounded-lg border border-ink-15 bg-white p-4">
        <h3 className="text-sm font-semibold text-ink-100">Exactly what we&rsquo;ll share</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-70">
          <li>
            Your Solar Project Brief: roof analysis, roof faces, the panel layout you chose
            {plan && ` (${formatKw(plan.system.dcSystemSizeKw.value)}, ${plan.system.panelCount.value} panels)`}
          </li>
          <li>
            Estimated production and the models behind it
            {plan?.production.annualAcKwh && ` (${formatKwhPerYear(plan.production.annualAcKwh.value)})`}
          </li>
          <li>Your electricity usage and how we derived it</li>
          <li>Every assumption behind the numbers, and the on-site verification checklist</li>
          <li>Your name, email, phone and ZIP code — so they can contact you</li>
        </ul>
        <p className="mt-3 text-xs text-ink-40">
          We do not share your utility account number, uploaded documents, or exact street address until you and the
          installer have agreed to proceed.
        </p>
      </section>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <EstimatorContactFields
          form={form}
          setForm={setForm}
          idPrefix="solar-rfq"
        />

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="landing-btn-primary-lg" disabled={submitting}>
            {submitting ? "Submitting…" : "Send my project to installers"}
          </button>
          <button type="button" onClick={onBack} className="landing-btn-ghost">
            ← Back to results
          </button>
        </div>
      </form>
    </div>
  );
}
