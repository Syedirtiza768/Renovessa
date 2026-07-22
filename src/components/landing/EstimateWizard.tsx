"use client";

import { useMemo, useState } from "react";
import type { LandingCategoryId } from "@/lib/landing-data";
import { LANDING_CATEGORIES } from "@/lib/landing-data";
import {
  SHARED_CONTEXT_QUESTIONS,
  buildQuestionLabelMap,
  getTradeWizard,
  getWizardCategories,
  optionLabel,
  type WizardQuestion,
} from "@/lib/estimate-wizard-data";
import {
  buildRfqDescription,
  calculateBallpark,
  estimateToBudgetRange,
  formatMoney,
  type EstimateAnswers,
} from "@/lib/estimate-pricing";
import { CONTACT_WINDOW_OPTIONS } from "@/lib/landing-data";
import { FIRST_JOB_MODE, PILOT_ZIP_CLUSTERS } from "@/lib/first-job-config";

type Phase =
  | "trade"
  | "scope"
  | "context"
  | "notes"
  | "estimate"
  | "contact"
  | "done";

const PHASES: Phase[] = ["trade", "scope", "context", "notes", "estimate", "contact"];

function phaseIndex(p: Phase) {
  return PHASES.indexOf(p);
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "." };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function mapUrgency(u: string): string {
  if (u === "As soon as possible") return "ASAP";
  return u || "Just planning";
}

function mapContact(w: string): string {
  if (w === "morning") return "Morning";
  if (w === "afternoon") return "Afternoon";
  if (w === "evening") return "Evening";
  return "Any time";
}

export function EstimateWizard() {
  const categories = getWizardCategories();
  const [phase, setPhase] = useState<Phase>("trade");
  const [trade, setTrade] = useState<LandingCategoryId | null>(null);
  const [answers, setAnswers] = useState<EstimateAnswers>({});
  const [notes, setNotes] = useState("");
  const [zip, setZip] = useState("");
  const [contact, setContact] = useState({
    name: "",
    email: "",
    phone: "",
    contactWindow: "any",
    consent: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [receiptId, setReceiptId] = useState("");
  const [portalEmail, setPortalEmail] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const [isExistingAccount, setIsExistingAccount] = useState(false);

  const tradeConfig = trade ? getTradeWizard(trade) : null;
  const tradeLabel =
    LANDING_CATEGORIES.find((c) => c.id === trade)?.label ?? "Home improvement";

  const estimate = useMemo(() => {
    if (!trade) return null;
    return calculateBallpark(trade, answers);
  }, [trade, answers]);

  const setAnswer = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[id];
      return next;
    });
  };

  function validateQuestions(questions: WizardQuestion[]): boolean {
    const next: Record<string, string> = {};
    for (const q of questions) {
      if (!q.required) continue;
      const v = answers[q.id];
      if (!v || !String(v).trim()) next[q.id] = "Please answer this to continue.";
      if (q.type === "number" && v) {
        const n = Number(v);
        if (Number.isNaN(n)) next[q.id] = "Enter a number.";
        else if (q.min != null && n < q.min) next[q.id] = `Minimum is ${q.min}.`;
        else if (q.max != null && n > q.max) next[q.id] = `Maximum is ${q.max}.`;
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goScope() {
    if (!trade) {
      setErrors({ trade: "Pick a project type to continue." });
      return;
    }
    setErrors({});
    setPhase("scope");
  }

  function goContext() {
    if (!tradeConfig || !validateQuestions(tradeConfig.questions)) return;
    setPhase("context");
  }

  function goNotes() {
    if (!validateQuestions(SHARED_CONTEXT_QUESTIONS)) return;
    if (!/^\d{5}$/.test(zip)) {
      setErrors({ zip: "Enter a 5-digit ZIP code." });
      return;
    }
    if (FIRST_JOB_MODE && PILOT_ZIP_CLUSTERS.length > 0 && !PILOT_ZIP_CLUSTERS.includes(zip)) {
      setErrors({ zip: "Your ZIP is not currently in our service area." });
      return;
    }
    setErrors({});
    setPhase("notes");
  }

  function goEstimate() {
    setErrors({});
    setPhase("estimate");
  }

  function goContact() {
    setPhase("contact");
  }

  async function submitRfq() {
    if (!trade || !estimate) return;
    const next: Record<string, string> = {};
    if (!contact.name.trim()) next.name = "Enter your full name.";
    const digits = contact.phone.replace(/\D/g, "");
    if (digits.length !== 10) next.phone = "Enter a valid 10-digit US phone number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) next.email = "Enter a valid email.";
    if (!contact.consent) next.consent = "Consent is required to submit your RFQ.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      const { firstName, lastName } = splitName(contact.name);
      const labelMap = buildQuestionLabelMap(trade);
      const description = buildRfqDescription(tradeLabel, answers, estimate, labelMap, notes);

      const res = await fetch("/api/project-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trade: tradeLabel,
          description,
          urgency: mapUrgency(answers.urgency || "Just planning"),
          budgetRange: estimateToBudgetRange(estimate),
          firstName,
          lastName,
          phone: digits,
          email: contact.email.trim(),
          zipCode: zip,
          preferredContact: mapContact(contact.contactWindow),
          tcpaConsent: true,
          ownershipAuthority: answers.ownership || undefined,
          source: "estimate_wizard",
          qualificationNotes: JSON.stringify({
            ballparkLow: estimate.low,
            ballparkHigh: estimate.high,
            ballparkMid: estimate.mid,
            confidence: estimate.confidence,
            summary: estimate.summary,
            answers,
            notes: notes.trim() || null,
          }),
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
      setPhase("done");
    } catch (e) {
      setErrors({ submit: e instanceof Error ? e.message : "Something went wrong" });
    } finally {
      setLoading(false);
    }
  }

  function restart() {
    setPhase("trade");
    setTrade(null);
    setAnswers({});
    setNotes("");
    setZip("");
    setContact({ name: "", email: "", phone: "", contactWindow: "any", consent: true });
    setErrors({});
    setReceiptId("");
    setPortalPassword("");
  }

  const stepNum = phase === "done" ? PHASES.length : Math.max(1, phaseIndex(phase) + 1);
  const stepTotal = PHASES.length;

  return (
    <section id="estimate" className="scroll-mt-20 bg-bone-1 px-4 py-14 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <p className="landing-eyebrow">I. Free project estimate</p>
        <h2 className="landing-h2 mt-3 max-w-2xl">
          Home improvement estimate wizard
        </h2>
        <p className="mt-4 max-w-[58ch] text-lg text-ink-70">
          Answer a focused set of questions so we understand the full job — then get a real DMV
          ballpark and submit an RFQ. Renovessa gathers contractor bids and gets back to you.
        </p>

        <div className="landing-card mt-10 overflow-hidden shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
          {phase !== "done" && (
            <div className="flex items-center justify-between gap-3 border-b border-ink-15 px-5 py-3 sm:px-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink-100">
                <span className="landing-pulse" aria-hidden />
                Estimate &amp; RFQ
              </div>
              <span className="font-mono-landing text-[11px] text-ink-40">
                Step {stepNum} of {stepTotal}
              </span>
            </div>
          )}

          <div className="border-b border-ink-15 px-5 py-2 sm:px-6">
            <div className="flex gap-1">
              {PHASES.map((p, i) => (
                <div
                  key={p}
                  className={`h-1 flex-1 rounded-full ${
                    phase === "done" || phaseIndex(phase) >= i ? "bg-accent" : "bg-ink-15"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {phase === "trade" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-semibold text-ink-100">What needs work?</h3>
                  <p className="mt-1 text-sm text-ink-70">
                    Pick the closest category. You can clarify details in the next steps.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {categories.map((cat) => {
                    const active = trade === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setTrade(cat.id);
                          setAnswers({});
                          setErrors({});
                        }}
                        className={`rounded-lg border p-3.5 text-left transition ${
                          active
                            ? "border-2 border-accent bg-accent-100"
                            : "border-ink-15 bg-white hover:border-ink-40"
                        }`}
                        aria-pressed={active}
                      >
                        <p className="text-sm font-semibold text-ink-100">{cat.label}</p>
                        <p className="mt-0.5 text-xs text-ink-70">{cat.description}</p>
                      </button>
                    );
                  })}
                </div>
                {errors.trade && (
                  <p className="text-sm text-danger-landing" role="alert">
                    {errors.trade}
                  </p>
                )}
                <button type="button" className="landing-btn-primary w-full sm:w-auto" onClick={goScope}>
                  Continue →
                </button>
              </div>
            )}

            {phase === "scope" && tradeConfig && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-ink-100">{tradeLabel} scope</h3>
                  <p className="mt-1 text-sm text-ink-70">{tradeConfig.intro}</p>
                </div>
                {tradeConfig.questions.map((q) => (
                  <QuestionField
                    key={q.id}
                    question={q}
                    value={answers[q.id] || ""}
                    error={errors[q.id]}
                    onChange={(v) => setAnswer(q.id, v)}
                  />
                ))}
                <div className="flex flex-wrap gap-3">
                  <button type="button" className="landing-btn-ghost" onClick={() => setPhase("trade")}>
                    Back
                  </button>
                  <button type="button" className="landing-btn-primary" onClick={goContext}>
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {phase === "context" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-ink-100">Property &amp; timing</h3>
                  <p className="mt-1 text-sm text-ink-70">
                    These details help contractors bid accurately and help us route your RFQ.
                  </p>
                </div>
                <div>
                  <label htmlFor="est-zip" className="landing-label">
                    Project ZIP code <span className="text-danger-landing">*</span>
                  </label>
                  <input
                    id="est-zip"
                    className="landing-input mt-1 max-w-[10rem]"
                    inputMode="numeric"
                    maxLength={5}
                    value={zip}
                    onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                    placeholder="22030"
                  />
                  {errors.zip && (
                    <p className="mt-1 text-sm text-danger-landing" role="alert">
                      {errors.zip}
                    </p>
                  )}
                </div>
                {SHARED_CONTEXT_QUESTIONS.map((q) => (
                  <QuestionField
                    key={q.id}
                    question={q}
                    value={answers[q.id] || ""}
                    error={errors[q.id]}
                    onChange={(v) => setAnswer(q.id, v)}
                  />
                ))}
                <div className="flex flex-wrap gap-3">
                  <button type="button" className="landing-btn-ghost" onClick={() => setPhase("scope")}>
                    Back
                  </button>
                  <button type="button" className="landing-btn-primary" onClick={goNotes}>
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {phase === "notes" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-semibold text-ink-100">Anything else about the job?</h3>
                  <p className="mt-1 text-sm text-ink-70">
                    Materials you already bought, HOA rules, photos you can share later, must-have
                    dates, prior quotes — the more contractors know, the better the bids.
                  </p>
                </div>
                <textarea
                  className="landing-input min-h-[140px] w-full resize-y"
                  maxLength={2000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Example: Second-floor bath over kitchen. Prefer weekday mornings. Have a Pinterest board for tile. Need permit handled by contractor."
                />
                <p className="text-xs text-ink-40">{notes.length}/2000</p>
                <div className="flex flex-wrap gap-3">
                  <button type="button" className="landing-btn-ghost" onClick={() => setPhase("context")}>
                    Back
                  </button>
                  <button type="button" className="landing-btn-primary" onClick={goEstimate}>
                    See my ballpark →
                  </button>
                </div>
              </div>
            )}

            {phase === "estimate" && estimate && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-semibold text-ink-100">Your DMV ballpark</h3>
                  <p className="mt-1 text-sm text-ink-70">{estimate.summary}</p>
                </div>

                <div className="rounded-lg border border-accent/30 bg-accent-100 px-5 py-6 text-center">
                  <p className="font-mono-landing text-xs uppercase tracking-wide text-ink-40">
                    Estimated range
                  </p>
                  <p className="mt-2 font-mono-landing text-3xl font-medium text-ink-100 sm:text-4xl">
                    {formatMoney(estimate.low)} – {formatMoney(estimate.high)}
                  </p>
                  <p className="mt-2 text-sm text-ink-70">
                    Midpoint ~{formatMoney(estimate.mid)} ·{" "}
                    {estimate.confidence === "solid"
                      ? "Fairly tight range"
                      : estimate.confidence === "wide"
                        ? "Wide range — site visit will narrow it"
                        : "Typical planning range"}
                  </p>
                </div>

                {estimate.drivers.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-40">
                      What&apos;s driving this number
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm text-ink-70">
                      {estimate.drivers.map((d) => (
                        <li key={d} className="flex gap-2">
                          <span className="text-accent" aria-hidden>
                            ·
                          </span>
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-xs leading-relaxed text-ink-40">{estimate.disclaimer}</p>

                <div className="rounded-lg border border-ink-15 bg-bone-0 p-4">
                  <p className="text-sm font-semibold text-ink-100">Next: turn this into an RFQ</p>
                  <p className="mt-1 text-sm text-ink-70">
                    Submit your request for quote to Renovessa. We share the scoped job with vetted
                    contractors, collect bids, and get back to you with options — no obligation to hire.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button type="button" className="landing-btn-ghost" onClick={() => setPhase("notes")}>
                    Back
                  </button>
                  <button type="button" className="landing-btn-primary" onClick={goContact}>
                    Create RFQ &amp; get bids →
                  </button>
                </div>
              </div>
            )}

            {phase === "contact" && estimate && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-semibold text-ink-100">Submit your RFQ</h3>
                  <p className="mt-1 text-sm text-ink-70">
                    We&apos;ll use this to follow up with bids for your {tradeLabel.toLowerCase()} project
                    in {zip}.
                  </p>
                </div>

                <div className="rounded-lg border border-ink-15 bg-bone-0 p-4 text-sm">
                  <p className="font-semibold text-ink-100">RFQ summary</p>
                  <dl className="mt-2 space-y-1 text-ink-70">
                    <div className="flex justify-between gap-4">
                      <dt>Trade</dt>
                      <dd className="font-medium text-ink-100">{tradeLabel}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Ballpark</dt>
                      <dd className="font-medium text-ink-100">
                        {formatMoney(estimate.low)} – {formatMoney(estimate.high)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Timing</dt>
                      <dd className="font-medium text-ink-100">
                        {answers.urgency
                          ? optionLabel(
                              SHARED_CONTEXT_QUESTIONS.find((q) => q.id === "urgency")!,
                              answers.urgency
                            )
                          : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>ZIP</dt>
                      <dd className="font-medium text-ink-100">{zip}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <label htmlFor="est-name" className="landing-label">
                    Full name <span className="text-danger-landing">*</span>
                  </label>
                  <input
                    id="est-name"
                    className="landing-input mt-1"
                    value={contact.name}
                    onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                    autoComplete="name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-danger-landing" role="alert">
                      {errors.name}
                    </p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="est-email" className="landing-label">
                      Email <span className="text-danger-landing">*</span>
                    </label>
                    <input
                      id="est-email"
                      type="email"
                      className="landing-input mt-1"
                      value={contact.email}
                      onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                      autoComplete="email"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-danger-landing" role="alert">
                        {errors.email}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="est-phone" className="landing-label">
                      Phone <span className="text-danger-landing">*</span>
                    </label>
                    <input
                      id="est-phone"
                      type="tel"
                      className="landing-input mt-1"
                      value={contact.phone}
                      onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                      placeholder="(571) 460-0006"
                      autoComplete="tel"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-danger-landing" role="alert">
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="est-window" className="landing-label">
                    Best time to reach you
                  </label>
                  <select
                    id="est-window"
                    className="landing-input mt-1"
                    value={contact.contactWindow}
                    onChange={(e) => setContact((c) => ({ ...c, contactWindow: e.target.value }))}
                  >
                    {CONTACT_WINDOW_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-start gap-3 text-sm text-ink-70">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={contact.consent}
                    onChange={(e) => setContact((c) => ({ ...c, consent: e.target.checked }))}
                  />
                  <span>
                    I agree to be contacted by Renovessa by phone, SMS, and email about this RFQ and
                    contractor bids. Message and data rates may apply. Reply STOP to opt out.
                  </span>
                </label>
                {errors.consent && (
                  <p className="text-sm text-danger-landing" role="alert">
                    {errors.consent}
                  </p>
                )}
                {errors.submit && (
                  <p className="text-sm text-danger-landing" role="alert">
                    {errors.submit}
                  </p>
                )}

                <div className="flex flex-wrap gap-3">
                  <button type="button" className="landing-btn-ghost" onClick={() => setPhase("estimate")}>
                    Back
                  </button>
                  <button
                    type="button"
                    className="landing-btn-primary"
                    disabled={loading}
                    onClick={submitRfq}
                  >
                    {loading ? "Submitting RFQ…" : "Submit RFQ to Renovessa →"}
                  </button>
                </div>
              </div>
            )}

            {phase === "done" && (
              <div className="space-y-5">
                <div className="rounded-lg border border-green-300 bg-green-50 px-5 py-6 text-center">
                  <p className="font-mono-landing text-sm font-medium uppercase tracking-wide text-green-800">
                    RFQ received
                  </p>
                  <p className="mt-3 font-mono-landing text-2xl font-medium text-ink-100">
                    {receiptId}
                  </p>
                  <p className="mt-2 text-sm text-ink-70">
                    Thanks{contact.name.trim() ? `, ${contact.name.trim().split(/\s+/)[0]}` : ""}. Your{" "}
                    {tradeLabel.toLowerCase()} estimate is in our queue.
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-ink-100">What happens next</p>
                  <ol className="mt-3 space-y-3 border-l border-ink-15 pl-4 text-sm text-ink-70">
                    <li>
                      <span className="font-medium text-ink-100">We review your RFQ</span> — scope,
                      ZIP, and ballpark you saw.
                    </li>
                    <li>
                      <span className="font-medium text-ink-100">We solicit contractor bids</span>{" "}
                      from vetted pros who handle this trade in your area.
                    </li>
                    <li>
                      <span className="font-medium text-ink-100">We get back to you</span> with bid
                      options and next steps — usually within 1–2 business days.
                    </li>
                  </ol>
                </div>

                {portalPassword && (
                  <div className="rounded-lg border border-ink-15 bg-bone-0 p-4">
                    <p className="text-sm font-semibold text-ink-100">
                      {isExistingAccount
                        ? "Your portal password has been reset"
                        : "Your homeowner portal account is ready"}
                    </p>
                    <p className="mt-1 text-xs text-ink-70">
                      Log in to track this RFQ and any bids we return.
                    </p>
                    <dl className="mt-3 space-y-2 font-mono-landing text-sm">
                      <div className="flex justify-between gap-4 rounded border border-ink-15 bg-white px-3 py-2">
                        <dt className="text-ink-40">Email</dt>
                        <dd>{portalEmail}</dd>
                      </div>
                      <div className="flex justify-between gap-4 rounded border border-ink-15 bg-white px-3 py-2">
                        <dt className="text-ink-40">Password</dt>
                        <dd>{portalPassword}</dd>
                      </div>
                    </dl>
                  </div>
                )}

                <button type="button" className="landing-btn-ghost" onClick={restart}>
                  Start another estimate
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function QuestionField({
  question,
  value,
  error,
  onChange,
}: {
  question: WizardQuestion;
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  if (question.type === "number") {
    return (
      <div>
        <label htmlFor={`q-${question.id}`} className="landing-label">
          {question.label}
          {question.required && <span className="text-danger-landing"> *</span>}
        </label>
        {question.help && <p className="mt-1 text-xs text-ink-40">{question.help}</p>}
        <div className="mt-1 flex items-center gap-2">
          <input
            id={`q-${question.id}`}
            type="number"
            className="landing-input max-w-[10rem]"
            min={question.min}
            max={question.max}
            step={question.step ?? 1}
            placeholder={question.placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          {question.suffix && <span className="text-sm text-ink-40">{question.suffix}</span>}
        </div>
        {error && (
          <p className="mt-1 text-sm text-danger-landing" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <fieldset>
      <legend className="landing-label">
        {question.label}
        {question.required && <span className="text-danger-landing"> *</span>}
      </legend>
      {question.help && <p className="mt-1 text-xs text-ink-40">{question.help}</p>}
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {question.options?.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`rounded-lg border px-3 py-2.5 text-left transition ${
                active
                  ? "border-2 border-accent bg-accent-100"
                  : "border-ink-15 bg-white hover:border-ink-40"
              }`}
              aria-pressed={active}
            >
              <span className="text-sm font-medium text-ink-100">{opt.label}</span>
              {opt.hint && <span className="mt-0.5 block text-xs text-ink-40">{opt.hint}</span>}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="mt-1 text-sm text-danger-landing" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
