"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BUDGET_OPTIONS,
  CONTACT_WINDOW_OPTIONS,
  URGENCY_OPTIONS_LANDING,
  OWNERSHIP_OPTIONS,
  getVisibleCategories,
} from "@/lib/landing-data";
import type { LandingCategoryId } from "@/lib/landing-data";
import { FIRST_JOB_MODE, PILOT_ZIP_CLUSTERS } from "@/lib/first-job-config";
import { mapBudget, mapContact, mapUrgency, splitName } from "@/lib/project-intake";
import { COMMUNICATION_CONSENT_TEXT, LEGAL_CLICKWRAP_TEXT } from "@/lib/compliance-versions";

type FormErrors = Record<string, string>;

interface Prefill {
  name: string;
  email: string;
  phone: string;
}

export function PortalProjectForm({ prefill }: { prefill: Prefill }) {
  const router = useRouter();
  const categories = getVisibleCategories();
  const [selected, setSelected] = useState<LandingCategoryId[]>([]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState({
    description: "",
    budget: "",
    name: prefill.name,
    phone: prefill.phone,
    email: prefill.email,
    zip: "",
    address: "",
    ownership: "",
    appointmentWindows: "",
    contactWindow: "any",
    urgency: "",
    consent: false,
    legalAccepted: false,
  });

  const update = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleCategory = (id: LandingCategoryId) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const labels = selected
    .map((id) => categories.find((c) => c.id === id)?.label)
    .filter(Boolean) as string[];

  useEffect(() => {
    if (selected.length === 0) return;
    setErrors((e) => {
      const next = { ...e };
      delete next.categories;
      return next;
    });
  }, [selected]);

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
    if (!form.legalAccepted) {
      setErrors({ legalAccepted: "Accept the Terms and acknowledge the Privacy Policy to submit." });
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
          description: form.description.trim() || "Submitted via homeowner portal — details pending qualification call.",
          urgency: mapUrgency(form.urgency),
          budgetRange: mapBudget(form.budget),
          firstName,
          lastName,
          phone: form.phone.replace(/\D/g, ""),
          email: form.email,
          zipCode: form.zip,
          preferredContact: mapContact(form.contactWindow),
          tcpaConsent: form.consent,
          termsAccepted: form.legalAccepted,
          privacyAcknowledged: form.legalAccepted,
          address: form.address.trim() || undefined,
          ownershipAuthority: form.ownership || undefined,
          preferredAppointmentWindows: form.appointmentWindows.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      router.push(`/portal/homeowner/projects/${data.id}`);
      router.refresh();
    } catch (e) {
      setErrors({ submit: e instanceof Error ? e.message : "Something went wrong" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card-accent overflow-hidden">
      <div className="border-b border-rule bg-blueprint px-4 py-3">
        <p className="text-sm font-medium">Step {step} of 3</p>
        <div className="mt-2 flex gap-2" aria-hidden>
          {[1, 2, 3].map((s) => (
            <span
              key={s}
              className={`h-1.5 flex-1 rounded-full ${step >= s ? "bg-copper" : "bg-rule"}`}
            />
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <h2 className="text-xl font-semibold">Tell us what you need done</h2>

        {step === 1 && (
          <div className="mt-6 space-y-6">
            <fieldset>
              <legend className="label">
                Type of work <span className="text-danger">*</span>
              </legend>
              <div className={`mt-2 flex flex-wrap gap-2 ${errors.categories ? "rounded-lg ring-2 ring-danger" : ""}`}>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id as LandingCategoryId)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      selected.includes(cat.id as LandingCategoryId)
                        ? "bg-copper text-white"
                        : "border border-rule bg-white text-muted hover:border-copper"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              {errors.categories && <p className="mt-1 text-sm text-danger">{errors.categories}</p>}
            </fieldset>

            <div>
              <label htmlFor="description" className="label">Describe the project</label>
              <textarea
                id="description"
                className="input mt-1 min-h-[100px]"
                rows={4}
                maxLength={600}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </div>

            <fieldset>
              <legend className="label">Budget range <span className="text-danger">*</span></legend>
              <div className="mt-2 space-y-2">
                {BUDGET_OPTIONS.map((opt) => (
                  <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm">
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
              {errors.budget && <p className="mt-1 text-sm text-danger">{errors.budget}</p>}
            </fieldset>

            <button type="button" className="btn-primary w-full" onClick={() => validateStep1() && setStep(2)}>
              Next: Contact info →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="name" className="label">Full name <span className="text-danger">*</span></label>
                <input id="name" className="input mt-1" value={form.name} onChange={(e) => update("name", e.target.value)} />
                {errors.name && <p className="mt-1 text-sm text-danger">{errors.name}</p>}
              </div>
              <div>
                <label htmlFor="phone" className="label">Phone <span className="text-danger">*</span></label>
                <input id="phone" type="tel" className="input mt-1" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                {errors.phone && <p className="mt-1 text-sm text-danger">{errors.phone}</p>}
              </div>
              <div>
                <label htmlFor="email" className="label">Email</label>
                <input id="email" type="email" className="input mt-1 bg-blueprint" value={form.email} readOnly />
                <p className="mt-1 text-xs text-muted">Linked to your portal account</p>
              </div>
              <div>
                <label htmlFor="zip" className="label">ZIP code <span className="text-danger">*</span></label>
                <input
                  id="zip"
                  className="input mt-1"
                  maxLength={5}
                  inputMode="numeric"
                  value={form.zip}
                  onChange={(e) => update("zip", e.target.value.replace(/\D/g, "").slice(0, 5))}
                />
                {errors.zip && <p className="mt-1 text-sm text-danger">{errors.zip}</p>}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="address" className="label">Project address</label>
                <input id="address" className="input mt-1" value={form.address} onChange={(e) => update("address", e.target.value)} />
              </div>
            </div>

            <fieldset>
              <legend className="label">Preferred contact time <span className="text-danger">*</span></legend>
              <div className="mt-2 space-y-2">
                {CONTACT_WINDOW_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm">
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
              <legend className="label">How urgent is this? <span className="text-danger">*</span></legend>
              <div className="mt-2 space-y-2">
                {URGENCY_OPTIONS_LANDING.map((opt) => (
                  <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm">
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
              {errors.urgency && <p className="mt-1 text-sm text-danger">{errors.urgency}</p>}
            </fieldset>

            <div className="flex gap-3">
              <button type="button" className="btn-secondary flex-1" onClick={() => setStep(1)}>Back</button>
              <button type="button" className="btn-primary flex-1" onClick={() => validateStep2() && setStep(3)}>
                Next: Final details →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 space-y-6">
            <fieldset>
              <legend className="label">Do you own the home?</legend>
              <div className="mt-2 space-y-2">
                {OWNERSHIP_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm">
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
              <label htmlFor="appointmentWindows" className="label">Preferred appointment windows</label>
              <input
                id="appointmentWindows"
                className="input mt-1"
                placeholder="e.g. Weekday mornings, or Saturday after 2pm"
                value={form.appointmentWindows}
                onChange={(e) => update("appointmentWindows", e.target.value)}
              />
            </div>

            <div>
              <label className="flex items-start gap-3 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => update("consent", e.target.checked)}
                  className="mt-1 accent-accent"
                />
                <span>
                  {COMMUNICATION_CONSENT_TEXT}{" "}
                  <Link href="/tcpa" className="text-copper hover:underline">Calls and texts disclosure</Link>
                </span>
              </label>
              {errors.consent && <p className="mt-1 text-sm text-danger">{errors.consent}</p>}
            </div>

            <div>
              <label className="flex items-start gap-3 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={form.legalAccepted}
                  onChange={(e) => update("legalAccepted", e.target.checked)}
                  className="mt-1 accent-accent"
                />
                <span>
                  {LEGAL_CLICKWRAP_TEXT} <Link href="/terms" className="text-copper hover:underline">Terms</Link> · <Link href="/privacy" className="text-copper hover:underline">Privacy</Link>
                </span>
              </label>
              {errors.legalAccepted && <p className="mt-1 text-sm text-danger">{errors.legalAccepted}</p>}
            </div>

            {errors.submit && <p className="text-sm text-danger">{errors.submit}</p>}

            <div className="flex gap-3">
              <button type="button" className="btn-secondary flex-1" onClick={() => setStep(2)}>Back</button>
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={loading || !form.legalAccepted}
                onClick={submit}
              >
                {loading ? "Submitting…" : "Submit Project Request"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
