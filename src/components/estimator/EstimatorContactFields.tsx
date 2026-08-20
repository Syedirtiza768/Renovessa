"use client";

import type { Dispatch, SetStateAction } from "react";
import { COMMUNICATION_CONSENT_TEXT, LEGAL_CLICKWRAP_TEXT } from "@/lib/compliance-versions";

export type EstimatorContactState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  zipCode: string;
  timeline: string;
  preferredContact: string;
  maxContractors: number;
  notes: string;
  tcpaConsent: boolean;
  termsAccepted: boolean;
  privacyAcknowledged: boolean;
};

export function createEstimatorContactState(defaultZip = "", prefill?: { name?: string; email?: string; phone?: string }): EstimatorContactState {
  const nameParts = (prefill?.name ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: nameParts[0] ?? "",
    lastName: nameParts.slice(1).join(" "),
    email: prefill?.email ?? "",
    phone: prefill?.phone ?? "",
    zipCode: defaultZip,
    timeline: "",
    preferredContact: "any",
    maxContractors: 3,
    notes: "",
    tcpaConsent: false,
    termsAccepted: false,
    privacyAcknowledged: false,
  };
}

export function validateEstimatorContact(form: EstimatorContactState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.firstName.trim()) errors.firstName = "Enter your first name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = "Enter a valid email.";
  if (!/^\d{10}$/.test(form.phone.replace(/\D/g, ""))) {
    errors.phone = "Enter a valid 10-digit US phone number.";
  }
  if (!/^\d{5}$/.test(form.zipCode)) errors.zipCode = "Enter a 5-digit ZIP code.";
  if (!form.termsAccepted) errors.termsAccepted = "Accept the Terms to continue.";
  if (!form.privacyAcknowledged) errors.privacyAcknowledged = "Acknowledge the Privacy Policy to continue.";
  return errors;
}

export function EstimatorContactFields({
  form,
  setForm,
  errors = {},
  idPrefix = "estimator-contact",
  lockEmail = false,
  compact = false,
}: {
  form: EstimatorContactState;
  setForm: Dispatch<SetStateAction<EstimatorContactState>>;
  errors?: Record<string, string>;
  idPrefix?: string;
  lockEmail?: boolean;
  compact?: boolean;
}) {
  const setField = <K extends keyof EstimatorContactState>(key: K, value: EstimatorContactState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };
  const inputClass = "landing-input mt-1 w-full";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" required id={`${idPrefix}-first`} error={errors.firstName}>
          <input
            id={`${idPrefix}-first`}
            className={inputClass}
            value={form.firstName}
            onChange={(event) => setField("firstName", event.target.value)}
            autoComplete="given-name"
          />
        </Field>
        <Field label="Last name" id={`${idPrefix}-last`}>
          <input
            id={`${idPrefix}-last`}
            className={inputClass}
            value={form.lastName}
            onChange={(event) => setField("lastName", event.target.value)}
            autoComplete="family-name"
          />
        </Field>
      </div>

      <Field label="Email" required id={`${idPrefix}-email`} error={errors.email}>
        <input
          id={`${idPrefix}-email`}
          type="email"
          className={inputClass}
          value={form.email}
          onChange={(event) => setField("email", event.target.value)}
          autoComplete="email"
          readOnly={lockEmail}
          disabled={lockEmail}
        />
        {lockEmail && <p className="mt-1 text-xs text-ink-40">Tied to your portal account.</p>}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mobile phone" required id={`${idPrefix}-phone`} error={errors.phone}>
          <input
            id={`${idPrefix}-phone`}
            type="tel"
            className={inputClass}
            value={form.phone}
            onChange={(event) => setField("phone", event.target.value)}
            placeholder="(555) 555-5555"
            autoComplete="tel"
            inputMode="tel"
          />
        </Field>
        <Field label="Project ZIP code" required id={`${idPrefix}-zip`} error={errors.zipCode}>
          <input
            id={`${idPrefix}-zip`}
            className={inputClass}
            value={form.zipCode}
            onChange={(event) => setField("zipCode", event.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="20850"
            inputMode="numeric"
            maxLength={5}
            autoComplete="postal-code"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="When do you want to start?" id={`${idPrefix}-timeline`}>
          <select
            id={`${idPrefix}-timeline`}
            className={inputClass}
            value={form.timeline}
            onChange={(event) => setField("timeline", event.target.value)}
          >
            <option value="">Flexible / not sure</option>
            <option value="ASAP">As soon as possible</option>
            <option value="Within 1 month">Within 1 month</option>
            <option value="1-3 months">1–3 months</option>
            <option value="3-6 months">3–6 months</option>
            <option value="Just planning">Just planning for now</option>
          </select>
        </Field>
        <Field label="Preferred contact" id={`${idPrefix}-contact`}>
          <select
            id={`${idPrefix}-contact`}
            className={inputClass}
            value={form.preferredContact}
            onChange={(event) => setField("preferredContact", event.target.value)}
          >
            <option value="any">Any</option>
            <option value="phone">Phone call</option>
            <option value="text">Text message</option>
            <option value="email">Email</option>
          </select>
        </Field>
      </div>

      <Field label={`How many contractors? (${form.maxContractors})`} id={`${idPrefix}-contractors`}>
        <div className="mt-1 flex gap-2">
          {[1, 2, 3].map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => setField("maxContractors", count)}
              aria-pressed={form.maxContractors === count}
              className={`rounded-lg border px-3 py-1 text-sm ${
                form.maxContractors === count
                  ? "border-accent bg-accent text-bone-0"
                  : "border-ink-15 text-ink-70 hover:border-ink-40"
              }`}
            >
              {count}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-ink-40">You control how many contractors receive your project.</p>
      </Field>

      <Field label="Notes for contractors (optional)" id={`${idPrefix}-notes`}>
        <textarea
          id={`${idPrefix}-notes`}
          className={`${inputClass} resize-y`}
          rows={compact ? 2 : 3}
          maxLength={4000}
          value={form.notes}
          onChange={(event) => setField("notes", event.target.value)}
          placeholder="Access constraints, HOA rules, preferred brands, must-have dates…"
        />
      </Field>

      <label className="flex items-start gap-3 text-sm text-ink-70">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0"
          checked={form.tcpaConsent}
          onChange={(event) => setField("tcpaConsent", event.target.checked)}
        />
        <span className="text-xs">
          {COMMUNICATION_CONSENT_TEXT} <a href="/tcpa" className="text-accent underline">Read the calls and texts disclosure.</a>
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm text-ink-70">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0"
          checked={form.termsAccepted}
          onChange={(event) => setField("termsAccepted", event.target.checked)}
        />
        <span className="text-xs">
          {LEGAL_CLICKWRAP_TEXT} <a href="/terms" className="text-accent underline">Terms</a> · <a href="/privacy" className="text-accent underline">Privacy</a>
        </span>
      </label>
      {errors.termsAccepted && <p className="text-xs text-red-700">{errors.termsAccepted}</p>}

      <label className="flex items-start gap-3 text-sm text-ink-70">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0"
          checked={form.privacyAcknowledged}
          onChange={(event) => setField("privacyAcknowledged", event.target.checked)}
        />
        <span className="text-xs">I acknowledge the Renovessa Privacy Policy and understand my project and contact information will be processed to coordinate this request.</span>
      </label>
      {errors.privacyAcknowledged && <p className="text-xs text-red-700">{errors.privacyAcknowledged}</p>}
    </div>
  );
}

function Field({
  label,
  required,
  id,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  id: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="landing-label">
        {label}{required && <span className="text-danger-landing"> *</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-danger-landing" role="alert">{error}</p>}
    </div>
  );
}
