"use client";

import { useEffect, useState } from "react";
import {
  BUDGET_OPTIONS,
  CONTACT_WINDOW_OPTIONS,
  URGENCY_OPTIONS_LANDING,
  OWNERSHIP_OPTIONS,
  getVisibleCategories,
} from "@/lib/landing-data";
import type { LandingCategoryId } from "@/lib/landing-data";
import { useCategories } from "./CategoryContext";
import { FIRST_JOB_MODE, PILOT_ZIP_CLUSTERS } from "@/lib/first-job-config";

type FormErrors = Record<string, string>;

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "." };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function mapUrgency(u: string): string {
  const map: Record<string, string> = {
    "As soon as possible": "ASAP",
    "Within 2 weeks": "Within 2 weeks",
    "Within 1 month": "Within 1 month",
    "Just planning": "Just planning",
  };
  return map[u] ?? u;
}

function mapBudget(b: string): string {
  return b.replace("–", "-");
}

function mapContact(w: string): string {
  const found = CONTACT_WINDOW_OPTIONS.find((o) => o.value === w);
  if (!found) return "Any time";
  if (w === "morning") return "Morning";
  if (w === "afternoon") return "Afternoon";
  if (w === "evening") return "Evening";
  return "Any time";
}

export function LandingProjectForm() {
  const { selected, toggle, isSelected, labels, setSelected, prefill } = useCategories();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [receiptId, setReceiptId] = useState("");
  const [portalEmail, setPortalEmail] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const [isExistingAccount, setIsExistingAccount] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState({
    description: "",
    budget: "",
    name: "",
    phone: "",
    email: "",
    zip: "",
    address: "",
    ownership: "",
    appointmentWindows: "",
    contactWindow: "any",
    urgency: "",
    consent: true,
  });

  const categories = getVisibleCategories();

  const update = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    if (selected.length === 0) return;
    setErrors((e) => {
      const next = { ...e };
      delete next.categories;
      return next;
    });
  }, [selected]);

  // Pre-fill from the hero AI advisor. Categories are applied via setSelected in
  // the advisor widget; here we merge the free-text + choice fields it inferred.
  useEffect(() => {
    if (!prefill) return;
    setForm((prev) => ({
      ...prev,
      description: prefill.description ?? prev.description,
      urgency:
        prefill.urgency && URGENCY_OPTIONS_LANDING.includes(prefill.urgency)
          ? prefill.urgency
          : prev.urgency,
      budget:
        prefill.budget && BUDGET_OPTIONS.includes(prefill.budget) ? prefill.budget : prev.budget,
    }));
  }, [prefill]);

  function validateStep1(): boolean {
    const next: FormErrors = {};
    if (selected.length === 0) next.categories = "Pick at least one type of work.";
    if (!form.budget) next.budget = "Select a budget range.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function validateStep2(): boolean {
    const next: FormErrors = {};
    if (!form.name.trim()) next.name = "Enter your full name.";
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length !== 10) next.phone = "Enter a valid 10-digit US phone number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Enter a valid email.";
    if (!/^\d{5}$/.test(form.zip)) next.zip = "Enter a 5-digit ZIP code.";
    if (FIRST_JOB_MODE && PILOT_ZIP_CLUSTERS.length > 0 && !PILOT_ZIP_CLUSTERS.includes(form.zip)) {
      next.zip = "Your ZIP is not currently in our service area.";
    }
    if (!form.contactWindow) next.contactWindow = "Select a preferred contact time.";
    if (!form.urgency) next.urgency = "Select how urgent this is.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (!form.consent) {
      setErrors({ consent: "Consent is required to submit." });
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      const { firstName, lastName } = splitName(form.name);
      const trade =
        labels.length > 0
          ? labels.join(", ")
          : categories.find((c) => c.id === selected[0])?.label ?? "General";

      const res = await fetch("/api/project-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trade,
          description: form.description.trim() || "Submitted via landing page — details pending qualification call.",
          urgency: mapUrgency(form.urgency),
          budgetRange: mapBudget(form.budget),
          firstName,
          lastName,
          phone: form.phone.replace(/\D/g, ""),
          email: form.email,
          zipCode: form.zip,
          preferredContact: mapContact(form.contactWindow),
          tcpaConsent: true,
          address: form.address.trim() || undefined,
          ownershipAuthority: form.ownership || undefined,
          preferredAppointmentWindows: form.appointmentWindows.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setReceiptId(data.referenceNumber);
      if (data.tempPassword) {
        setPortalEmail(data.email);
        setPortalPassword(data.tempPassword);
        setIsExistingAccount(data.isExistingAccount ?? false);
      }
      setSubmitted(true);
      document.getElementById("request")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      setErrors({ submit: e instanceof Error ? e.message : "Something went wrong" });
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSubmitted(false);
    setReceiptId("");
    setStep(1);
    setForm({
      description: "",
      budget: "",
      name: "",
      phone: "",
      email: "",
      zip: "",
      address: "",
      ownership: "",
      appointmentWindows: "",
      contactWindow: "any",
      urgency: "",
      consent: true,
    });
    setSelected([]);
  }

  if (submitted) {
    const firstName = form.name.trim().split(/\s+/)[0] || "there";
    return (
      <div className="landing-card overflow-hidden">
        <div className="border-b border-ink-15 bg-success-50 px-6 py-8 text-center">
          <p className="font-mono-landing text-xl font-medium uppercase tracking-wide text-success-landing">
            ✓ Request received
          </p>
        </div>
        <div className="p-6 sm:p-8">
          <p className="text-lg text-ink-100">
            Your project request has been received, {firstName}.
          </p>
          <p className="mt-4 font-mono-landing text-2xl font-medium text-ink-100">{receiptId}</p>
          <p className="mt-6 text-sm font-semibold text-ink-100">What happens next:</p>
          <ol className="mt-4 space-y-3 border-l border-ink-15 pl-4">
            {[
              { label: "Submitted", status: "done" },
              { label: "Reviewing", status: "pending" },
              { label: "Qualification call", status: "pending", note: "Within 4 business hours" },
              { label: "Appointment scheduled", status: "pending" },
            ].map((item) => (
              <li key={item.label} className="flex items-start gap-3 text-sm">
                <span
                  className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                    item.status === "done" ? "bg-success-landing" : "border border-ink-40 bg-white"
                  }`}
                  aria-hidden
                />
                <div>
                  <span className="font-medium text-ink-100">{item.label}</span>
                  {item.status === "done" && (
                    <span className="ml-2 text-ink-40">— Done</span>
                  )}
                  {item.note && <p className="text-ink-40">{item.note}</p>}
                </div>
              </li>
            ))}
          </ol>

          {portalPassword && (
            <div className="mt-6 rounded-lg border border-ink-15 bg-bone-1 p-4">
              <p className="text-sm font-semibold text-ink-100">
                {isExistingAccount ? "Your portal password has been reset" : "Your homeowner portal account is ready"}
              </p>
              <p className="mt-1 text-xs text-ink-70">
                {isExistingAccount
                  ? "Log in to track your project, view appointment details, and confirm visits."
                  : "We created a portal account for you. Log in to track your project."}
              </p>
              <dl className="mt-3 space-y-2 font-mono-landing text-sm">
                <div className="flex items-center justify-between gap-4 rounded bg-white px-3 py-2 border border-ink-15">
                  <dt className="text-ink-40">Email</dt>
                  <dd className="font-medium text-ink-100 break-all">{portalEmail}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 rounded bg-white px-3 py-2 border border-ink-15">
                  <dt className="text-ink-40">Password</dt>
                  <dd className="font-medium text-ink-100 tracking-widest">{portalPassword}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-ink-40">
                Save this password — it is only shown once. You can change it after logging in.
              </p>
              <a
                href="/login"
                className="landing-btn-primary mt-4 block w-full text-center"
              >
                Log in to Homeowner Portal →
              </a>
            </div>
          )}

          <p className="mt-6 text-sm text-ink-70">
            Keep your reference number — quote it if you call us.
          </p>
          <p className="mt-2 text-sm text-ink-70">
            You&apos;ll receive a text message confirmation shortly.
          </p>
          <button type="button" className="landing-btn-ghost mt-6 w-full" onClick={resetForm}>
            Submit another request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="landing-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-15 bg-bone-1 px-4 py-2.5 font-mono-landing text-[11px] uppercase tracking-wide text-ink-40">
        <span>Project intake · Renovessa · DMV</span>
        <span>Form RNV-1 · Rev. 2025.06</span>
      </div>

      <div className="border-b border-ink-15 px-4 py-3 sm:px-6">
        <p className="text-sm font-medium text-ink-100">
          Step {step} of 3
        </p>
        <div className="mt-2 flex gap-2" aria-hidden>
          {[1, 2, 3].map((s) => (
            <span
              key={s}
              className={`h-1.5 flex-1 rounded-full ${step >= s ? "bg-accent" : "bg-ink-15"}`}
            />
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <h2 className="font-serif-landing text-2xl text-ink-100">Tell Renovessa what you need done.</h2>

        {step === 1 && (
          <div className="mt-6 space-y-6">
            <fieldset>
              <legend className="landing-label">
                Type of work <span className="text-danger-landing">*</span>
              </legend>
              <div
                className={`mt-2 flex flex-wrap gap-2 rounded-lg p-1 ${
                  errors.categories ? "ring-2 ring-danger-landing" : ""
                }`}
                role="group"
                aria-describedby={errors.categories ? "err-categories" : undefined}
              >
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggle(cat.id as LandingCategoryId)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                      isSelected(cat.id)
                        ? "bg-accent text-bone-0"
                        : "border border-ink-15 bg-white text-ink-70 hover:border-ink-40"
                    }`}
                    aria-pressed={isSelected(cat.id)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              {errors.categories && (
                <p id="err-categories" className="mt-1 text-sm text-danger-landing" role="alert">
                  {errors.categories}
                </p>
              )}
            </fieldset>

            <div>
              <label htmlFor="description" className="landing-label">
                Describe the project
              </label>
              <textarea
                id="description"
                className="landing-input mt-1 min-h-[100px]"
                rows={4}
                maxLength={600}
                placeholder="e.g. 'Master bathroom needs a full remodel — new tile, vanity, walk-in shower. Built in 1987, never updated.' Or: 'AC is blowing warm. Two-story colonial in Bethesda.'"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />
              <p className="mt-1 text-xs text-ink-40">
                {form.description.length}/600 — Optional but helps us match the right specialty
              </p>
            </div>

            <fieldset>
              <legend className="landing-label">
                Budget range <span className="text-danger-landing">*</span>
              </legend>
              <div className="mt-2 space-y-2">
                {BUDGET_OPTIONS.map((opt) => (
                  <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm text-ink-70">
                    <input
                      type="radio"
                      name="budget"
                      value={opt}
                      checked={form.budget === opt}
                      onChange={() => update("budget", opt)}
                      className="accent-accent"
                    />
                    {opt}
                  </label>
                ))}
              </div>
              {errors.budget && (
                <p className="mt-1 text-sm text-danger-landing" role="alert">
                  {errors.budget}
                </p>
              )}
            </fieldset>

            <button
              type="button"
              className="landing-btn-primary w-full"
              onClick={() => validateStep1() && setStep(2)}
            >
              Next: Contact info →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="name" className="landing-label">
                  Full name <span className="text-danger-landing">*</span>
                </label>
                <input
                  id="name"
                  className="landing-input mt-1"
                  placeholder="e.g. Jordan Pierce"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "err-name" : undefined}
                />
                {errors.name && (
                  <p id="err-name" className="mt-1 text-sm text-danger-landing" role="alert">
                    {errors.name}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="phone" className="landing-label">
                  Phone number <span className="text-danger-landing">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  className="landing-input mt-1"
                  placeholder="(571) 460-0006"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? "err-phone" : undefined}
                />
                {errors.phone && (
                  <p id="err-phone" className="mt-1 text-sm text-danger-landing" role="alert">
                    {errors.phone}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="email" className="landing-label">
                  Email address <span className="text-danger-landing">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  className="landing-input mt-1"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "err-email" : undefined}
                />
                {errors.email && (
                  <p id="err-email" className="mt-1 text-sm text-danger-landing" role="alert">
                    {errors.email}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="zip" className="landing-label">
                  ZIP code <span className="text-danger-landing">*</span>
                </label>
                <input
                  id="zip"
                  className="landing-input mt-1"
                  maxLength={5}
                  inputMode="numeric"
                  value={form.zip}
                  onChange={(e) => update("zip", e.target.value.replace(/\D/g, "").slice(0, 5))}
                  aria-invalid={!!errors.zip}
                  aria-describedby={errors.zip ? "err-zip" : undefined}
                />
                {errors.zip && (
                  <p id="err-zip" className="mt-1 text-sm text-danger-landing" role="alert">
                    {errors.zip}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="address" className="landing-label">
                  Project address
                </label>
                <input
                  id="address"
                  className="landing-input mt-1"
                  placeholder="e.g. 1234 Main St, Fairfax, VA 22030"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                />
              </div>
            </div>

            <fieldset>
              <legend className="landing-label">
                Preferred contact time <span className="text-danger-landing">*</span>
              </legend>
              <div className="mt-2 space-y-2">
                {CONTACT_WINDOW_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm text-ink-70">
                    <input
                      type="radio"
                      name="contactWindow"
                      value={opt.value}
                      checked={form.contactWindow === opt.value}
                      onChange={() => update("contactWindow", opt.value)}
                      className="accent-accent"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="landing-label">
                How urgent is this? <span className="text-danger-landing">*</span>
              </legend>
              <div className="mt-2 space-y-2">
                {URGENCY_OPTIONS_LANDING.map((opt) => (
                  <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm text-ink-70">
                    <input
                      type="radio"
                      name="urgency"
                      value={opt}
                      checked={form.urgency === opt}
                      onChange={() => update("urgency", opt)}
                      className="accent-accent"
                    />
                    {opt}
                  </label>
                ))}
              </div>
              {errors.urgency && (
                <p className="mt-1 text-sm text-danger-landing" role="alert">
                  {errors.urgency}
                </p>
              )}
            </fieldset>

            <div className="flex gap-3">
              <button type="button" className="landing-btn-ghost flex-1" onClick={() => setStep(1)}>
                Back
              </button>
              <button
                type="button"
                className="landing-btn-primary flex-1"
                onClick={() => validateStep2() && setStep(3)}
              >
                Next: Final details →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 space-y-6">
            <fieldset>
              <legend className="landing-label">
                Do you own the home?
              </legend>
              <div className="mt-2 space-y-2">
                {OWNERSHIP_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm text-ink-70">
                    <input
                      type="radio"
                      name="ownership"
                      value={opt.value}
                      checked={form.ownership === opt.value}
                      onChange={() => update("ownership", opt.value)}
                      className="accent-accent"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="appointmentWindows" className="landing-label">
                Preferred appointment windows
              </label>
              <input
                id="appointmentWindows"
                className="landing-input mt-1"
                placeholder="e.g. Weekday mornings, or Saturday after 2pm"
                value={form.appointmentWindows}
                onChange={(e) => update("appointmentWindows", e.target.value)}
              />
            </div>

            <div>
              <p className="landing-label">Optional photos</p>
              <div className="mt-2 flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-dashed border-ink-15 bg-bone-1 px-4 py-8 text-center">
                <span className="text-2xl text-ink-40" aria-hidden>
                  📷
                </span>
                <p className="mt-2 text-sm text-ink-70">
                  Drag and drop up to 3 photos (10MB each)
                </p>
                <p className="mt-1 text-xs text-ink-40">Photo upload available in homeowner portal after qualification</p>
              </div>
            </div>

            <div>
              <label className="flex items-start gap-3 text-sm text-ink-70">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => update("consent", e.target.checked)}
                  className="mt-1 accent-accent"
                  aria-describedby={errors.consent ? "err-consent" : undefined}
                />
                <span>
                  By submitting, I agree to be contacted by Renovessa by phone and SMS regarding my
                  project request. Message and data rates may apply. Reply STOP to opt out.{" "}
                  <a href="/trust" className="text-accent underline">
                    Consent disclosure
                  </a>
                </span>
              </label>
              {errors.consent && (
                <p id="err-consent" className="mt-1 text-sm text-danger-landing" role="alert">
                  {errors.consent}
                </p>
              )}
            </div>

            {errors.submit && (
              <p className="text-sm text-danger-landing" role="alert">
                {errors.submit}
              </p>
            )}

            <div className="flex gap-3">
              <button type="button" className="landing-btn-ghost flex-1" onClick={() => setStep(2)}>
                Back
              </button>
              <button
                type="button"
                className="landing-btn-primary flex-1 text-base"
                disabled={loading || !form.consent}
                onClick={submit}
              >
                {loading ? "Submitting…" : "Submit My Project Request →"}
              </button>
            </div>

            <p className="text-center text-xs font-medium text-ink-40">
              Free to submit · Renovessa will call to confirm within 4 business hours · No obligation
              to hire
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
