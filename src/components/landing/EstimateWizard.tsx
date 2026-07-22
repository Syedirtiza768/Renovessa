"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { LandingCategoryId } from "@/lib/landing-data";
import { LANDING_CATEGORIES, CONTACT_WINDOW_OPTIONS } from "@/lib/landing-data";
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
import { FIRST_JOB_MODE, PILOT_ZIP_CLUSTERS } from "@/lib/first-job-config";
import { useOptionalCategories } from "./CategoryContext";

type Phase =
  | "trade"
  | "scope"
  | "context"
  | "notes"
  | "estimate"
  | "contact"
  | "review"
  | "done";

const PHASES: Phase[] = ["trade", "scope", "context", "notes", "estimate", "contact", "review"];

const PHASE_LABELS: Record<Phase, string> = {
  trade: "Trade",
  scope: "Scope",
  context: "Property",
  notes: "Notes",
  estimate: "Ballpark",
  contact: "Contact",
  review: "Review",
  done: "Done",
};

const DRAFT_KEY = "renovessa_estimate_draft_v1";

type ContactState = {
  name: string;
  email: string;
  phone: string;
  contactWindow: string;
  consent: boolean;
};

type DraftPayload = {
  phase: Phase;
  trade: LandingCategoryId | null;
  answers: EstimateAnswers;
  notes: string;
  zip: string;
  contact: ContactState;
  scopeStep: number;
  contextStep: number;
  updatedAt: number;
};

type NavSpec = {
  back?: { label: string; onClick: () => void };
  primary: { label: string; onClick: () => void; disabled?: boolean };
} | null;

function phaseIndex(p: Phase) {
  return PHASES.indexOf(p);
}

function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
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

function displayAnswer(tradeId: LandingCategoryId, id: string, value: string): string {
  const tradeQ = getTradeWizard(tradeId)?.questions.find((q) => q.id === id);
  if (tradeQ) return optionLabel(tradeQ, value);
  const shared = SHARED_CONTEXT_QUESTIONS.find((q) => q.id === id);
  if (shared) return optionLabel(shared, value);
  return value;
}

function readDraft(): DraftPayload | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DraftPayload;
  } catch {
    return null;
  }
}

function writeDraft(draft: DraftPayload) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

function useIsMobileMd() {
  const [isMobile, setIsMobile] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    setReady(true);
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return { isMobile, ready };
}

function validateQuestions(
  questions: WizardQuestion[],
  answers: EstimateAnswers,
): Record<string, string> {
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
  return next;
}

export type EstimateWizardProps = {
  variant?: "landing" | "embedded";
  prefill?: { name?: string; email?: string; phone?: string };
  lockEmail?: boolean;
  onSubmitted?: (result: { id: string; referenceNumber: string }) => void;
};

export function EstimateWizard({
  variant = "landing",
  prefill,
  lockEmail = false,
  onSubmitted,
}: EstimateWizardProps) {
  const categories = getWizardCategories();
  const { isMobile, ready } = useIsMobileMd();
  const [phase, setPhase] = useState<Phase>("trade");
  const [trade, setTrade] = useState<LandingCategoryId | null>(null);
  const [answers, setAnswers] = useState<EstimateAnswers>({});
  const [notes, setNotes] = useState("");
  const [zip, setZip] = useState("");
  const [contact, setContact] = useState<ContactState>({
    name: prefill?.name ?? "",
    email: prefill?.email ?? "",
    phone: prefill?.phone ?? "",
    contactWindow: "any",
    consent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [receiptId, setReceiptId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [portalEmail, setPortalEmail] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const [isExistingAccount, setIsExistingAccount] = useState(false);
  const [emailSent, setEmailSent] = useState(true);
  const [scopeStep, setScopeStep] = useState(0);
  const [contextStep, setContextStep] = useState(0);
  const [draftAvailable, setDraftAvailable] = useState(false);
  const [localSheetOpen, setLocalSheetOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const embedded = variant === "embedded";
  const categoryCtx = useOptionalCategories();
  const wizardEntryToken = categoryCtx?.wizardEntry?.token;
  const wizardEntryTrade = categoryCtx?.wizardEntry?.trade;
  const clearWizardEntry = categoryCtx?.clearWizardEntry;

  const openSheet = useCallback(() => {
    if (categoryCtx?.openWizardSheet) categoryCtx.openWizardSheet();
    else setLocalSheetOpen(true);
  }, [categoryCtx]);

  const closeSheet = useCallback(() => {
    if (categoryCtx?.closeWizardSheet) categoryCtx.closeWizardSheet();
    else setLocalSheetOpen(false);
  }, [categoryCtx]);

  const sheetOpen = embedded
    ? isMobile
    : categoryCtx
      ? categoryCtx.wizardSheetOpen
      : localSheetOpen;

  const tradeConfig = trade ? getTradeWizard(trade) : null;
  const tradeLabel =
    LANDING_CATEGORIES.find((c) => c.id === trade)?.label ?? "Home improvement";
  const scopeQuestions = useMemo(() => tradeConfig?.questions ?? [], [tradeConfig]);
  const contextTotalSteps = 1 + SHARED_CONTEXT_QUESTIONS.length;
  const useSubSteps = isMobile && sheetOpen;

  useEffect(() => {
    setHydrated(true);
    if (readDraft()?.phase && readDraft()?.phase !== "done") setDraftAvailable(true);
    if (window.location.hash === "#estimate" && isMobileViewport()) openSheet();
    const onHash = () => {
      if (window.location.hash === "#estimate" && isMobileViewport()) openSheet();
    };
    const onCustom = () => openSheet();
    window.addEventListener("hashchange", onHash);
    window.addEventListener("renovessa:open-estimate", onCustom);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("renovessa:open-estimate", onCustom);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (wizardEntryToken == null || !wizardEntryTrade || !clearWizardEntry) return;
    if (!getWizardCategories().some((c) => c.id === wizardEntryTrade)) {
      clearWizardEntry();
      return;
    }
    setTrade(wizardEntryTrade);
    setAnswers({});
    setNotes("");
    setErrors({});
    setPhase("scope");
    setScopeStep(0);
    setContextStep(0);
    setReceiptId("");
    setProjectId("");
    setPortalPassword("");
    clearWizardEntry();
    if (isMobileViewport()) openSheet();
  }, [wizardEntryToken, wizardEntryTrade, clearWizardEntry, openSheet]);

  useEffect(() => {
    if (!hydrated || phase === "done") return;
    if (!trade && phase === "trade") return;
    writeDraft({
      phase,
      trade,
      answers,
      notes,
      zip,
      contact,
      scopeStep,
      contextStep,
      updatedAt: Date.now(),
    });
    setDraftAvailable(true);
  }, [hydrated, phase, trade, answers, notes, zip, contact, scopeStep, contextStep]);

  useEffect(() => {
    if (!isMobile || !sheetOpen || embedded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobile, sheetOpen, embedded]);

  useEffect(() => {
    if (!sheetOpen || embedded || !isMobile) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheet();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen, embedded, isMobile, closeSheet]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    const t = window.setTimeout(() => titleRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [phase, scopeStep, contextStep]);

  useEffect(
    () => () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    },
    [],
  );

  const estimate = useMemo(() => {
    if (!trade) return null;
    return calculateBallpark(trade, answers);
  }, [trade, answers]);

  const setAnswer = useCallback((id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[id];
      return next;
    });
  }, []);

  const goScope = useCallback(() => {
    if (!trade) {
      setErrors({ trade: "Pick a project type to continue." });
      return;
    }
    setErrors({});
    setScopeStep(0);
    setPhase("scope");
  }, [trade]);

  const goContext = useCallback(() => {
    if (!tradeConfig) return;
    const next = validateQuestions(tradeConfig.questions, answers);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setContextStep(0);
    setPhase("context");
  }, [tradeConfig, answers]);

  const goNotes = useCallback(() => {
    const next = validateQuestions(SHARED_CONTEXT_QUESTIONS, answers);
    if (!/^\d{5}$/.test(zip)) next.zip = "Enter a 5-digit ZIP code.";
    else if (FIRST_JOB_MODE && PILOT_ZIP_CLUSTERS.length > 0 && !PILOT_ZIP_CLUSTERS.includes(zip)) {
      next.zip = "Your ZIP is not currently in our service area.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setPhase("notes");
  }, [answers, zip]);

  const goEstimate = useCallback(() => {
    setErrors({});
    setPhase("estimate");
  }, []);

  const goContact = useCallback(() => setPhase("contact"), []);

  const goReview = useCallback(() => {
    const next: Record<string, string> = {};
    if (!contact.name.trim()) next.name = "Enter your full name.";
    if (contact.phone.replace(/\D/g, "").length !== 10)
      next.phone = "Enter a valid 10-digit US phone number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) next.email = "Enter a valid email.";
    if (!contact.consent) next.consent = "Consent is required to submit your RFQ.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setPhase("review");
  }, [contact]);

  const advanceScope = useCallback(
    (answersOverride?: EstimateAnswers) => {
      const effective = answersOverride ?? answers;
      const q = scopeQuestions[scopeStep];
      if (!q) return;
      const next = validateQuestions([q], effective);
      setErrors(next);
      if (Object.keys(next).length > 0) return;
      if (scopeStep < scopeQuestions.length - 1) {
        setScopeStep((s) => s + 1);
        return;
      }
      setContextStep(0);
      setPhase("context");
    },
    [scopeQuestions, scopeStep, answers],
  );

  const backScope = useCallback(() => {
    if (scopeStep > 0) setScopeStep((s) => s - 1);
    else setPhase("trade");
  }, [scopeStep]);

  const advanceContext = useCallback(
    (answersOverride?: EstimateAnswers) => {
      if (contextStep === 0) {
        const next: Record<string, string> = {};
        if (!/^\d{5}$/.test(zip)) next.zip = "Enter a 5-digit ZIP code.";
        else if (
          FIRST_JOB_MODE &&
          PILOT_ZIP_CLUSTERS.length > 0 &&
          !PILOT_ZIP_CLUSTERS.includes(zip)
        ) {
          next.zip = "Your ZIP is not currently in our service area.";
        }
        setErrors(next);
        if (Object.keys(next).length > 0) return;
        setContextStep(1);
        return;
      }
      const effective = answersOverride ?? answers;
      const q = SHARED_CONTEXT_QUESTIONS[contextStep - 1];
      if (!q) return;
      const next = validateQuestions([q], effective);
      setErrors(next);
      if (Object.keys(next).length > 0) return;
      if (contextStep < contextTotalSteps - 1) {
        setContextStep((s) => s + 1);
        return;
      }
      setPhase("notes");
    },
    [contextStep, zip, answers, contextTotalSteps],
  );

  const backContext = useCallback(() => {
    if (contextStep > 0) {
      setContextStep((s) => s - 1);
      return;
    }
    if (useSubSteps && scopeQuestions.length > 0) setScopeStep(scopeQuestions.length - 1);
    setPhase("scope");
  }, [contextStep, useSubSteps, scopeQuestions.length]);

  const scheduleAdvance = useCallback((fn: () => void) => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = setTimeout(fn, 220);
  }, []);

  /** Select + auto-advance with the new answers immediately (avoids stale closure / double-tap). */
  const selectAndAdvance = useCallback(
    (q: WizardQuestion, value: string, which: "scope" | "context") => {
      const nextAnswers = { ...answers, [q.id]: value };
      setAnswers(nextAnswers);
      setErrors((e) => {
        const cleared = { ...e };
        delete cleared[q.id];
        return cleared;
      });
      if (!useSubSteps || q.type !== "single") return;
      scheduleAdvance(() => {
        if (which === "scope") advanceScope(nextAnswers);
        else advanceContext(nextAnswers);
      });
    },
    [answers, useSubSteps, scheduleAdvance, advanceScope, advanceContext],
  );

  const submitRfq = useCallback(async () => {
    if (!trade || !estimate) return;
    setLoading(true);
    setErrors({});
    try {
      const { firstName, lastName } = splitName(contact.name);
      const digits = contact.phone.replace(/\D/g, "");
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
      setProjectId(data.id);
      setEmailSent(data.confirmationEmailSent !== false);
      if (data.tempPassword) {
        setPortalEmail(data.email);
        setPortalPassword(data.tempPassword);
        setIsExistingAccount(data.isExistingAccount ?? false);
      }
      clearDraft();
      setDraftAvailable(false);
      setPhase("done");
      onSubmitted?.({ id: data.id, referenceNumber: data.referenceNumber });
    } catch (e) {
      setErrors({ submit: e instanceof Error ? e.message : "Something went wrong" });
    } finally {
      setLoading(false);
    }
  }, [trade, estimate, contact, tradeLabel, answers, notes, zip, onSubmitted]);

  const restart = useCallback(() => {
    clearDraft();
    setDraftAvailable(false);
    setPhase("trade");
    setTrade(null);
    setAnswers({});
    setNotes("");
    setZip("");
    setContact({
      name: prefill?.name ?? "",
      email: prefill?.email ?? "",
      phone: prefill?.phone ?? "",
      contactWindow: "any",
      consent: false,
    });
    setErrors({});
    setReceiptId("");
    setProjectId("");
    setPortalPassword("");
    setEmailSent(true);
    setScopeStep(0);
    setContextStep(0);
  }, [prefill]);

  const restoreDraft = useCallback(() => {
    const draft = readDraft();
    if (!draft || draft.phase === "done") return;
    setPhase(draft.phase);
    setTrade(draft.trade);
    setAnswers(draft.answers || {});
    setNotes(draft.notes || "");
    setZip(draft.zip || "");
    setContact({
      name: draft.contact?.name ?? prefill?.name ?? "",
      email: draft.contact?.email ?? prefill?.email ?? "",
      phone: draft.contact?.phone ?? prefill?.phone ?? "",
      contactWindow: draft.contact?.contactWindow ?? "any",
      consent: draft.contact?.consent ?? false,
    });
    setScopeStep(draft.scopeStep ?? 0);
    setContextStep(draft.contextStep ?? 0);
    setErrors({});
    openSheet();
  }, [prefill, openSheet]);

  const nav: NavSpec = useMemo(() => {
    switch (phase) {
      case "trade":
        return { primary: { label: "Continue →", onClick: goScope } };
      case "scope":
        return {
          back: {
            label: "Back",
            onClick: useSubSteps ? backScope : () => setPhase("trade"),
          },
          primary: {
            label: "Continue →",
            onClick: useSubSteps ? () => advanceScope() : goContext,
          },
        };
      case "context":
        return {
          back: {
            label: "Back",
            onClick: useSubSteps ? backContext : () => setPhase("scope"),
          },
          primary: {
            label: "Continue →",
            onClick: useSubSteps ? () => advanceContext() : goNotes,
          },
        };
      case "notes":
        return {
          back: { label: "Back", onClick: () => setPhase("context") },
          primary: { label: "See my ballpark →", onClick: goEstimate },
        };
      case "estimate":
        return {
          back: { label: "Back", onClick: () => setPhase("notes") },
          primary: { label: "Create RFQ & get bids →", onClick: goContact },
        };
      case "contact":
        return {
          back: { label: "Back", onClick: () => setPhase("estimate") },
          primary: { label: "Preview my RFQ →", onClick: goReview },
        };
      case "review":
        return {
          back: { label: "Back", onClick: () => setPhase("contact") },
          primary: {
            label: loading ? "Submitting RFQ…" : "Submit RFQ to Renovessa →",
            onClick: () => void submitRfq(),
            disabled: loading,
          },
        };
      default:
        return null;
    }
  }, [
    phase,
    useSubSteps,
    loading,
    goScope,
    goContext,
    goNotes,
    goEstimate,
    goContact,
    goReview,
    advanceScope,
    backScope,
    advanceContext,
    backContext,
    submitRfq,
  ]);

  const stepNum = phase === "done" ? PHASES.length : Math.max(1, phaseIndex(phase) + 1);
  const phaseLabel = PHASE_LABELS[phase];
  const answerRows =
    trade == null
      ? []
      : Object.entries(answers)
          .filter(([, v]) => v)
          .map(([id, value]) => ({
            id,
            label: buildQuestionLabelMap(trade)[id] || id,
            value: displayAnswer(trade, id, value),
          }));

  const scopeMicro =
    useSubSteps && phase === "scope" && scopeQuestions.length > 0
      ? `Question ${scopeStep + 1} of ${scopeQuestions.length}`
      : useSubSteps && phase === "context"
        ? contextStep === 0
          ? "ZIP code"
          : `Question ${contextStep} of ${SHARED_CONTEXT_QUESTIONS.length}`
        : null;

  const liveAnnouncement =
    phase === "done"
      ? "RFQ submitted"
      : `Step ${stepNum} of ${PHASES.length}: ${phaseLabel}${scopeMicro ? `. ${scopeMicro}` : ""}`;

  const jumpToPhase = (p: Phase) => {
    if (phase === "done") return;
    if (phaseIndex(p) >= phaseIndex(phase)) return;
    setPhase(p);
    if (p === "scope") setScopeStep(0);
    if (p === "context") setContextStep(0);
  };

  const body = (
    <PhaseContent
      phase={phase}
      titleRef={titleRef}
      categories={categories}
      trade={trade}
      onPickTrade={(id) => {
        setTrade(id);
        setAnswers({});
        setErrors({});
        if (useSubSteps) {
          scheduleAdvance(() => {
            setScopeStep(0);
            setPhase("scope");
          });
        }
      }}
      errors={errors}
      tradeConfig={tradeConfig}
      tradeLabel={tradeLabel}
      answers={answers}
      setAnswer={setAnswer}
      useSubSteps={useSubSteps}
      scopeStep={scopeStep}
      scopeQuestions={scopeQuestions}
      selectAndAdvance={selectAndAdvance}
      zip={zip}
      setZip={setZip}
      contextStep={contextStep}
      notes={notes}
      setNotes={setNotes}
      estimate={estimate}
      contact={contact}
      setContact={setContact}
      lockEmail={lockEmail}
      answerRows={answerRows}
      receiptId={receiptId}
      emailSent={emailSent}
      portalPassword={portalPassword}
      portalEmail={portalEmail}
      isExistingAccount={isExistingAccount}
      embedded={embedded}
      projectId={projectId}
      restart={restart}
      setPhase={setPhase}
    />
  );

  const renderChrome = (mobile: boolean) => (
    <WizardShell
      mobile={mobile}
      phase={phase}
      stepNum={stepNum}
      stepTotal={PHASES.length}
      phaseLabel={phaseLabel}
      scopeMicro={scopeMicro}
      liveAnnouncement={liveAnnouncement}
      bodyRef={bodyRef}
      onClose={mobile && !embedded ? closeSheet : undefined}
      nav={nav}
      jumpToPhase={jumpToPhase}
    >
      {body}
    </WizardShell>
  );

  const sectionClass = embedded
    ? "scroll-mt-20"
    : "scroll-mt-20 bg-bone-1 px-4 py-14 sm:px-6 sm:py-16";

  return (
    <section id="estimate" className={sectionClass}>
      <div className={embedded ? "" : "mx-auto max-w-3xl"}>
        {!embedded && (
          <>
            <p className="landing-eyebrow">II. Free project estimate</p>
            <h2 className="landing-h2 mt-3 max-w-2xl">Home improvement estimate wizard</h2>
            <p className="mt-4 max-w-[58ch] text-lg text-ink-70">
              Answer a focused set of questions so we understand the full job — then get a real DMV
              ballpark, preview your RFQ, and submit. Renovessa gathers contractor bids and gets back
              to you.
            </p>
          </>
        )}

        {/* Single instance — avoids duplicate input IDs / refs across breakpoints */}
        {!ready ? (
          <div
            className={`landing-card min-h-[12rem] animate-pulse bg-bone-2/40 ${embedded ? "" : "mt-10"}`}
            aria-hidden
          />
        ) : !isMobile ? (
          <div className={embedded ? "" : "mt-10"}>{renderChrome(false)}</div>
        ) : sheetOpen ? (
          <div
            className="fixed inset-0 z-[60] flex flex-col bg-bone-0"
            role="dialog"
            aria-modal="true"
            aria-label="Estimate and RFQ wizard"
          >
            {renderChrome(true)}
          </div>
        ) : (
          !embedded && (
            <div className="mt-8">
              <div className="landing-card overflow-hidden p-5 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink-100">
                  <span className="landing-pulse" aria-hidden />
                  Estimate &amp; RFQ
                </div>
                <p className="mt-2 text-sm text-ink-70">
                  Full-screen guided wizard — pick a trade, answer a few questions, get a DMV
                  ballpark, and submit your RFQ.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    className="landing-btn-primary min-h-[44px] w-full"
                    onClick={() => {
                      if (phase === "done") restart();
                      openSheet();
                    }}
                  >
                    {phase !== "trade" && phase !== "done"
                      ? "Continue estimate →"
                      : "Start estimate →"}
                  </button>
                  {draftAvailable && (phase === "trade" || phase === "done") && (
                    <button
                      type="button"
                      className="landing-btn-ghost min-h-[44px] w-full"
                      onClick={restoreDraft}
                    >
                      Resume saved progress
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
}

function WizardShell({
  mobile,
  phase,
  stepNum,
  stepTotal,
  phaseLabel,
  scopeMicro,
  liveAnnouncement,
  bodyRef,
  onClose,
  nav,
  jumpToPhase,
  children,
}: {
  mobile: boolean;
  phase: Phase;
  stepNum: number;
  stepTotal: number;
  phaseLabel: string;
  scopeMicro: string | null;
  liveAnnouncement: string;
  bodyRef: React.RefObject<HTMLDivElement | null>;
  onClose?: () => void;
  nav: NavSpec;
  jumpToPhase: (p: Phase) => void;
  children: ReactNode;
}) {
  return (
    <div
      className={
        mobile
          ? "flex h-full min-h-0 flex-col bg-bone-0"
          : "landing-card overflow-hidden shadow-[0_8px_24px_rgba(26,26,26,0.06)]"
      }
    >
      {phase !== "done" && (
        <div
          className={`shrink-0 border-b border-ink-15 ${
            mobile
              ? "px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
              : "px-5 py-3 sm:px-6"
          }`}
        >
          <div className="flex items-center gap-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-ink-70 transition hover:bg-ink-5"
                aria-label="Minimize wizard"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink-100">
                <span className="landing-pulse" aria-hidden />
                <span className="truncate">Estimate &amp; RFQ</span>
              </div>
              <p className="font-mono-landing text-[11px] text-ink-40">
                Step {stepNum} of {stepTotal}
                <span className="text-ink-70"> · {phaseLabel}</span>
                {scopeMicro ? <span> · {scopeMicro}</span> : null}
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-1" role="list" aria-label="Progress">
            {PHASES.map((p, i) => {
              const done = phaseIndex(phase) > i;
              const current = phase === p;
              const clickable = phaseIndex(p) < phaseIndex(phase);
              return (
                <button
                  key={p}
                  type="button"
                  role="listitem"
                  disabled={!clickable}
                  aria-label={`${PHASE_LABELS[p]}${current ? " (current)" : done ? " (completed)" : ""}`}
                  aria-current={current ? "step" : undefined}
                  onClick={() => clickable && jumpToPhase(p)}
                  className={`h-1.5 flex-1 rounded-full transition ${
                    done || current ? "bg-accent" : "bg-ink-15"
                  } ${current ? "ring-1 ring-accent/40 ring-offset-1" : ""} ${
                    clickable ? "cursor-pointer" : "cursor-default"
                  }`}
                />
              );
            })}
          </div>
          <p className="sr-only" aria-live="polite">
            {liveAnnouncement}
          </p>
        </div>
      )}

      <div
        ref={bodyRef}
        className={
          mobile
            ? "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5"
            : "p-5 sm:p-6"
        }
      >
        {children}
        {!mobile && nav && phase !== "done" && <NavButtons nav={nav} stacked={false} />}
      </div>

      {mobile && nav && phase !== "done" && (
        <div className="shrink-0 border-t border-ink-15 bg-bone-0/98 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <NavButtons nav={nav} stacked />
        </div>
      )}
    </div>
  );
}

function NavButtons({ nav, stacked }: { nav: NonNullable<NavSpec>; stacked: boolean }) {
  return (
    <div className={stacked ? "flex gap-3" : "mt-6 flex flex-wrap gap-3"}>
      {nav.back && (
        <button
          type="button"
          className={`landing-btn-ghost min-h-[44px] ${stacked ? "flex-1" : ""}`}
          onClick={nav.back.onClick}
        >
          {nav.back.label}
        </button>
      )}
      <button
        type="button"
        className={`landing-btn-primary min-h-[44px] ${stacked ? "flex-[2]" : "w-full sm:w-auto"}`}
        disabled={nav.primary.disabled}
        onClick={nav.primary.onClick}
      >
        {nav.primary.label}
      </button>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-ink-15/60 pb-2 last:border-0 last:pb-0 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="text-ink-70">{label}</dt>
      <dd className="font-medium text-ink-100 sm:max-w-[55%] sm:text-right">{value}</dd>
    </div>
  );
}

function PhaseContent(props: {
  phase: Phase;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
  categories: ReturnType<typeof getWizardCategories>;
  trade: LandingCategoryId | null;
  onPickTrade: (id: LandingCategoryId) => void;
  errors: Record<string, string>;
  tradeConfig: ReturnType<typeof getTradeWizard> | null;
  tradeLabel: string;
  answers: EstimateAnswers;
  setAnswer: (id: string, value: string) => void;
  useSubSteps: boolean;
  scopeStep: number;
  scopeQuestions: WizardQuestion[];
  selectAndAdvance: (q: WizardQuestion, value: string, which: "scope" | "context") => void;
  zip: string;
  setZip: (z: string) => void;
  contextStep: number;
  notes: string;
  setNotes: (n: string) => void;
  estimate: ReturnType<typeof calculateBallpark> | null;
  contact: ContactState;
  setContact: React.Dispatch<React.SetStateAction<ContactState>>;
  lockEmail: boolean;
  answerRows: { id: string; label: string; value: string }[];
  receiptId: string;
  emailSent: boolean;
  portalPassword: string;
  portalEmail: string;
  isExistingAccount: boolean;
  embedded: boolean;
  projectId: string;
  restart: () => void;
  setPhase: (p: Phase) => void;
}) {
  const {
    phase,
    titleRef,
    categories,
    trade,
    onPickTrade,
    errors,
    tradeConfig,
    tradeLabel,
    answers,
    setAnswer,
    useSubSteps,
    scopeStep,
    scopeQuestions,
    selectAndAdvance,
    zip,
    setZip,
    contextStep,
    notes,
    setNotes,
    estimate,
    contact,
    setContact,
    lockEmail,
    answerRows,
    receiptId,
    emailSent,
    portalPassword,
    portalEmail,
    isExistingAccount,
    embedded,
    projectId,
    restart,
    setPhase,
  } = props;

  if (phase === "trade") {
    return (
      <div className="space-y-5">
        <div>
          <h3 ref={titleRef} tabIndex={-1} className="text-lg font-semibold text-ink-100 outline-none">
            What needs work?
          </h3>
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
                onClick={() => onPickTrade(cat.id)}
                className={`min-h-[44px] rounded-lg border p-3.5 text-left transition ${
                  active
                    ? "border-2 border-accent bg-accent-100"
                    : "border-ink-15 bg-white hover:border-ink-40"
                }`}
                aria-pressed={active}
              >
                <p className="text-sm font-semibold text-ink-100">{cat.label}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-ink-70">{cat.description}</p>
              </button>
            );
          })}
        </div>
        {errors.trade && (
          <p className="text-sm text-danger-landing" role="alert">
            {errors.trade}
          </p>
        )}
      </div>
    );
  }

  if (phase === "scope" && tradeConfig) {
    const questions = useSubSteps
      ? scopeQuestions[scopeStep]
        ? [scopeQuestions[scopeStep]]
        : []
      : scopeQuestions;
    return (
      <div className="space-y-6">
        <div>
          <h3 ref={titleRef} tabIndex={-1} className="text-lg font-semibold text-ink-100 outline-none">
            {tradeLabel} scope
          </h3>
          <p className="mt-1 text-sm text-ink-70">
            {useSubSteps
              ? `Question ${scopeStep + 1} of ${scopeQuestions.length}`
              : tradeConfig.intro}
          </p>
        </div>
        {questions.map((q) => (
          <QuestionField
            key={q.id}
            question={q}
            value={answers[q.id] || ""}
            error={errors[q.id]}
            onChange={(v) => {
              if (q.type === "single") selectAndAdvance(q, v, "scope");
              else setAnswer(q.id, v);
            }}
          />
        ))}
      </div>
    );
  }

  if (phase === "context") {
    return (
      <div className="space-y-6">
        <div>
          <h3 ref={titleRef} tabIndex={-1} className="text-lg font-semibold text-ink-100 outline-none">
            Property &amp; timing
          </h3>
          <p className="mt-1 text-sm text-ink-70">
            {useSubSteps
              ? contextStep === 0
                ? "Where is the project?"
                : `Detail ${contextStep} of ${SHARED_CONTEXT_QUESTIONS.length}`
              : "These details help contractors bid accurately and help us route your RFQ."}
          </p>
        </div>

        {(!useSubSteps || contextStep === 0) && (
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
              autoComplete="postal-code"
            />
            {errors.zip && (
              <p className="mt-1 text-sm text-danger-landing" role="alert">
                {errors.zip}
              </p>
            )}
          </div>
        )}

        {(useSubSteps
          ? contextStep > 0
            ? [SHARED_CONTEXT_QUESTIONS[contextStep - 1]].filter(Boolean)
            : []
          : SHARED_CONTEXT_QUESTIONS
        ).map((q) => (
          <QuestionField
            key={q.id}
            question={q}
            value={answers[q.id] || ""}
            error={errors[q.id]}
            onChange={(v) => {
              if (q.type === "single") selectAndAdvance(q, v, "context");
              else setAnswer(q.id, v);
            }}
          />
        ))}
      </div>
    );
  }

  if (phase === "notes") {
    return (
      <div className="space-y-5">
        <div>
          <h3 ref={titleRef} tabIndex={-1} className="text-lg font-semibold text-ink-100 outline-none">
            Anything else about the job?
          </h3>
          <p className="mt-1 text-sm text-ink-70">
            Materials you already bought, HOA rules, photos you can share later, must-have dates,
            prior quotes — the more contractors know, the better the bids.
          </p>
        </div>
        <textarea
          className="landing-input w-full resize-y"
          style={{ minHeight: useSubSteps ? "40vh" : 140 }}
          maxLength={2000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Example: Second-floor bath over kitchen. Prefer weekday mornings. Have a Pinterest board for tile. Need permit handled by contractor."
        />
        <p className="text-xs text-ink-40">{notes.length}/2000</p>
      </div>
    );
  }

  if (phase === "estimate" && estimate) {
    return (
      <div className="space-y-5">
        <div>
          <h3 ref={titleRef} tabIndex={-1} className="text-lg font-semibold text-ink-100 outline-none">
            Your DMV ballpark
          </h3>
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
        <details className="rounded-lg border border-ink-15 bg-white px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-ink-100">How we estimate</summary>
          <p className="mt-2 text-xs leading-relaxed text-ink-40">{estimate.disclaimer}</p>
        </details>
        <div className="rounded-lg border border-ink-15 bg-bone-0 p-4">
          <p className="text-sm font-semibold text-ink-100">Next: turn this into an RFQ</p>
          <p className="mt-1 text-sm text-ink-70">
            Submit your request for quote to Renovessa. We check current trade and ZIP availability,
            request responses from relevant contractors, and bring available options back to you.
          </p>
        </div>
      </div>
    );
  }

  if (phase === "contact" && estimate) {
    return (
      <div className="space-y-5">
        <div>
          <h3 ref={titleRef} tabIndex={-1} className="text-lg font-semibold text-ink-100 outline-none">
            Your contact details
          </h3>
          <p className="mt-1 text-sm text-ink-70">
            We&apos;ll use this to send your RFQ confirmation and follow up with bids for your{" "}
            {tradeLabel.toLowerCase()} project in {zip}.
          </p>
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
            readOnly={lockEmail}
            disabled={lockEmail}
          />
          {lockEmail && <p className="mt-1 text-xs text-ink-40">Tied to your portal account.</p>}
          {errors.email && (
            <p className="mt-1 text-sm text-danger-landing" role="alert">
              {errors.email}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="est-phone" className="landing-label">
            Mobile phone <span className="text-danger-landing">*</span>
          </label>
          <input
            id="est-phone"
            type="tel"
            className="landing-input mt-1"
            value={contact.phone}
            onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
            autoComplete="tel"
            inputMode="tel"
            placeholder="(555) 555-5555"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-danger-landing" role="alert">
              {errors.phone}
            </p>
          )}
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
            className="mt-1 h-4 w-4 shrink-0"
            checked={contact.consent}
            onChange={(e) => setContact((c) => ({ ...c, consent: e.target.checked }))}
          />
          <span>
            I agree to be contacted by Renovessa about this RFQ and contractor bids.
            <details className="mt-1">
              <summary className="cursor-pointer text-xs text-ink-40">Read full consent</summary>
              <span className="mt-1 block text-xs leading-relaxed text-ink-40">
                Contact may be by phone, SMS, and email. Message/data rates may apply. Consent is not
                a condition of purchase. <a href="/tcpa" className="text-accent underline">Read the calls and texts disclosure.</a>
              </span>
            </details>
          </span>
        </label>
        {errors.consent && (
          <p className="text-sm text-danger-landing" role="alert">
            {errors.consent}
          </p>
        )}
      </div>
    );
  }

  if (phase === "review" && estimate && trade) {
    return (
      <div className="space-y-5">
        <div>
          <h3 ref={titleRef} tabIndex={-1} className="text-lg font-semibold text-ink-100 outline-none">
            Preview your RFQ
          </h3>
          <p className="mt-1 text-sm text-ink-70">
            Confirm everything looks right before we send it to Renovessa. You can go back to edit any
            step.
          </p>
        </div>
        <div className="rounded-lg border border-ink-15 bg-bone-0 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-40">
              Request for quote
            </p>
            <button
              type="button"
              className="text-xs font-medium text-accent"
              onClick={() => setPhase("contact")}
            >
              Edit contact
            </button>
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <ReviewRow label="Trade" value={tradeLabel} />
            <ReviewRow label="ZIP" value={zip} />
            <ReviewRow
              label="Ballpark shown"
              value={`${formatMoney(estimate.low)} – ${formatMoney(estimate.high)}`}
            />
            <ReviewRow
              label="Contact"
              value={
                <>
                  {contact.name}
                  <br />
                  <span className="font-normal text-ink-70">
                    {contact.email} · {contact.phone}
                  </span>
                </>
              }
            />
          </dl>
        </div>
        {answerRows.length > 0 && (
          <div className="rounded-lg border border-ink-15 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink-100">Scope answers</p>
              <button
                type="button"
                className="text-xs font-medium text-accent"
                onClick={() => setPhase("scope")}
              >
                Edit scope
              </button>
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              {answerRows.map((row) => (
                <ReviewRow key={row.id} label={row.label} value={row.value} />
              ))}
            </dl>
          </div>
        )}
        {notes.trim() && (
          <div className="rounded-lg border border-ink-15 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink-100">Your notes</p>
              <button
                type="button"
                className="text-xs font-medium text-accent"
                onClick={() => setPhase("notes")}
              >
                Edit
              </button>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink-70">{notes.trim()}</p>
          </div>
        )}
        <details className="text-xs text-ink-40">
          <summary className="cursor-pointer font-medium text-ink-70">Estimate disclaimer</summary>
          <p className="mt-1 leading-relaxed">{estimate.disclaimer}</p>
        </details>
        {errors.submit && (
          <p className="text-sm text-danger-landing" role="alert">
            {errors.submit}
          </p>
        )}
      </div>
    );
  }

  if (phase === "done" && estimate && trade) {
    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-green-300 bg-green-50 px-5 py-6 text-center">
          <p className="font-mono-landing text-sm font-medium uppercase tracking-wide text-green-800">
            RFQ received
          </p>
          <p
            ref={titleRef}
            tabIndex={-1}
            className="mt-3 font-mono-landing text-2xl font-medium text-ink-100 outline-none"
          >
            {receiptId}
          </p>
          <p className="mt-2 text-sm text-ink-70">
            Thanks{contact.name.trim() ? `, ${contact.name.trim().split(/\s+/)[0]}` : ""}. Your{" "}
            {tradeLabel.toLowerCase()} RFQ is in our queue.
          </p>
          <p className="mt-2 text-sm text-ink-70">
            {emailSent
              ? `A confirmation with this RFQ summary was sent to ${contact.email}.`
              : `We saved your RFQ, but the confirmation email may be delayed — keep this reference number.`}
          </p>
        </div>
        <div className="rounded-lg border border-ink-15 bg-bone-0 p-4">
          <p className="text-sm font-semibold text-ink-100">Your submitted RFQ</p>
          <dl className="mt-3 space-y-2 text-sm">
            <ReviewRow label="Trade" value={tradeLabel} />
            <ReviewRow label="ZIP" value={zip} />
            <ReviewRow
              label="Ballpark"
              value={`${formatMoney(estimate.low)} – ${formatMoney(estimate.high)}`}
            />
          </dl>
          {answerRows.length > 0 && (
            <dl className="mt-4 space-y-2 border-t border-ink-15 pt-3 text-sm">
              {answerRows.map((row) => (
                <ReviewRow key={row.id} label={row.label} value={row.value} />
              ))}
            </dl>
          )}
          {notes.trim() && (
            <div className="mt-4 border-t border-ink-15 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-40">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink-70">{notes.trim()}</p>
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-100">What happens next</p>
          <ol className="mt-3 space-y-3 border-l border-ink-15 pl-4 text-sm text-ink-70">
            <li>
              <span className="font-medium text-ink-100">We review your RFQ</span> — scope, ZIP, and
              ballpark you saw.
            </li>
            <li>
              <span className="font-medium text-ink-100">We check current availability</span> and
              request responses from relevant contractors who handle this trade in your area.
            </li>
            <li>
              <span className="font-medium text-ink-100">We get back to you</span> with available bid
              options and next steps. Timing varies by trade, ZIP, and current contractor capacity.
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
              Log in to track this RFQ and any bids we return. Credentials are also in your
              confirmation email.
            </p>
            <dl className="mt-3 space-y-2 font-mono-landing text-sm">
              <div className="flex flex-col gap-0.5 rounded border border-ink-15 bg-white px-3 py-2 sm:flex-row sm:justify-between">
                <dt className="text-ink-40">Email</dt>
                <dd className="break-all">{portalEmail}</dd>
              </div>
              <div className="flex flex-col gap-0.5 rounded border border-ink-15 bg-white px-3 py-2 sm:flex-row sm:justify-between">
                <dt className="text-ink-40">Password</dt>
                <dd className="break-all">{portalPassword}</dd>
              </div>
            </dl>
            <a
              href="/login"
              className="landing-btn-primary mt-4 inline-flex w-full justify-center text-sm sm:w-auto"
            >
              Open portal →
            </a>
          </div>
        )}
        {embedded && projectId && (
          <a
            href={`/portal/homeowner/projects/${projectId}`}
            className="landing-btn-primary inline-flex w-full justify-center sm:w-auto"
          >
            View this RFQ in my portal →
          </a>
        )}
        <button type="button" className="landing-btn-ghost w-full sm:w-auto" onClick={restart}>
          Start another estimate
        </button>
      </div>
    );
  }

  return null;
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
            inputMode="numeric"
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
              className={`min-h-[44px] rounded-lg border px-3 py-3 text-left transition ${
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
