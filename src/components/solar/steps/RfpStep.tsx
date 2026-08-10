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
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    zipCode: defaultZip,
    timeline: "",
    preferredContact: "",
    preferredContactTimes: "",
    maxInstallers: 3,
    notes: "",
    tcpaConsent: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ referenceNumber: string } | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" required>
            <input
              className="landing-input"
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              autoComplete="given-name"
              required
            />
          </Field>
          <Field label="Last name">
            <input
              className="landing-input"
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              autoComplete="family-name"
            />
          </Field>
          <Field label="Email" required>
            <input
              type="email"
              className="landing-input"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              autoComplete="email"
              required
            />
          </Field>
          <Field label="Phone" required>
            <input
              type="tel"
              className="landing-input"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              autoComplete="tel"
              required
            />
          </Field>
          <Field label="ZIP code" required>
            <input
              className="landing-input"
              value={form.zipCode}
              onChange={(e) => set("zipCode", e.target.value)}
              inputMode="numeric"
              autoComplete="postal-code"
              required
            />
          </Field>
          <Field label="When would you like this done?">
            <select
              className="landing-input"
              value={form.timeline}
              onChange={(e) => set("timeline", e.target.value)}
            >
              <option value="">Select…</option>
              <option>As soon as possible</option>
              <option>Within 3 months</option>
              <option>Within 6 months</option>
              <option>Within a year</option>
              <option>Just planning</option>
            </select>
          </Field>
          <Field label="How should they contact you?">
            <select
              className="landing-input"
              value={form.preferredContact}
              onChange={(e) => set("preferredContact", e.target.value)}
            >
              <option value="">Select…</option>
              <option>Email</option>
              <option>Phone</option>
              <option>Text</option>
            </select>
          </Field>
          <Field label="Best times to reach you">
            <input
              className="landing-input"
              placeholder="Weekday evenings"
              value={form.preferredContactTimes}
              onChange={(e) => set("preferredContactTimes", e.target.value)}
            />
          </Field>
        </div>

        <Field label="How many installers may receive this?">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => set("maxInstallers", n)}
                aria-pressed={form.maxInstallers === n}
                className={`h-11 w-11 rounded-lg border text-sm transition ${
                  form.maxInstallers === n
                    ? "border-accent bg-accent text-bone-0"
                    : "border-ink-15 text-ink-70 hover:border-ink-40"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Anything else installers should know?">
          <textarea
            className="landing-input min-h-[6rem]"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>

        {/* Affirmative, never pre-checked — matches the existing consent policy. */}
        <label className="flex items-start gap-3 rounded-lg border border-ink-15 bg-white p-4 text-sm text-ink-70">
          <input
            type="checkbox"
            checked={form.tcpaConsent}
            onChange={(e) => set("tcpaConsent", e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#c17a2a]"
          />
          <span>
            I agree that Renovessa and matched installers may contact me about this project by phone, text or email.
            Consent isn&rsquo;t a condition of purchase. See our{" "}
            <Link href="/tcpa" className="underline">
              calls and texts disclosure
            </Link>
            .
          </span>
        </label>

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

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="landing-label">
        {label}
        {required && <span className="text-accent"> *</span>}
      </span>
      {children}
    </label>
  );
}
