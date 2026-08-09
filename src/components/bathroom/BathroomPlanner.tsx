"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { BathroomFlags } from "./RockvilleBathroomPage";
import { loadDraft, saveDraft, clearDraft, type PlannerState, type PlannerAnswers } from "./planner-types";
import { IntroStep } from "./steps/IntroStep";
import { MeasurementsStep } from "./steps/MeasurementsStep";
import { ScopeStep } from "./steps/ScopeStep";
import { ConditionsStep } from "./steps/ConditionsStep";
import { EstimateStep } from "./steps/EstimateStep";
import { RequirementsPromptStep } from "./steps/RequirementsPromptStep";
import { LayoutWorkspace } from "./LayoutWorkspace";
import {
  hasBasicsFilled,
  hasCaptureContent,
  hasScopeFilled,
  hasSizeFilled,
} from "@/lib/bathroom/layout-templates";

type StepDef = {
  id: string;
  label: string;
  requires?: "diagramBuilder";
  /** Return false to hide this step for the current answers/mode. */
  when?: (ctx: { mode: "quick" | "detailed"; answers: PlannerAnswers; flags: BathroomFlags }) => boolean;
};

/**
 * Quick (default): Capture → Layout → Results
 * Detailed: also Basics / Measurements / Scope / Conditions when useful
 */
const ALL_STEPS: StepDef[] = [
  { id: "describe", label: "Capture" },
  {
    id: "location",
    label: "Basics",
    when: ({ mode, answers }) => mode === "detailed" || !hasBasicsFilled(answers),
  },
  {
    id: "measurements",
    label: "Size",
    when: ({ mode, answers }) => mode === "detailed" || !hasSizeFilled(answers),
  },
  {
    id: "layout",
    label: "Layout",
    requires: "diagramBuilder",
  },
  {
    id: "fixtures_finishes",
    label: "Scope",
    when: ({ mode, answers }) => mode === "detailed" || !hasScopeFilled(answers),
  },
  {
    id: "existing_conditions",
    label: "Conditions",
    when: ({ mode }) => mode === "detailed",
  },
  { id: "estimate", label: "Results" },
];

function newClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // RFC4122 v4 fallback (schema requires a UUID shape)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const INITIAL_STATE: PlannerState = {
  projectId: null,
  referenceNumber: null,
  clientId: null,
  mode: "quick",
  currentStep: "describe",
  answers: {},
  saving: false,
  lastSavedAt: null,
  saveFailed: false,
  error: null,
};

export function BathroomPlanner({ flags, backHref = "/bathroom-remodeling/rockville-md" }: { flags: BathroomFlags; backHref?: string }) {
  const [state, setState] = useState<PlannerState>(INITIAL_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [saveNonce, setSaveNonce] = useState(0);
  const creatingRef = useRef(false);

  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      // Migrate old step ids
      let currentStep = draft.currentStep ?? "describe";
      if (currentStep === "existing_layout" || currentStep === "proposed_layout") currentStep = "layout";
      if (currentStep === "permit_guidance") currentStep = "estimate";
      setState((prev) => ({
        ...prev,
        ...draft,
        mode: draft.mode ?? "quick",
        currentStep,
        saving: false,
        saveFailed: false,
        error: null,
      }));

      // Validate a resumed server draft: if it no longer exists (or is no
      // longer accessible), drop the stale id so a fresh draft is created
      // instead of PATCHing a dead project forever.
      if (draft.projectId) {
        const resumedId = draft.projectId;
        fetch(`/api/bathroom-projects/${resumedId}`)
          .then((res) => {
            if (res.ok) return;
            setState((prev) =>
              prev.projectId === resumedId
                ? { ...prev, projectId: null, referenceNumber: null }
                : prev,
            );
          })
          .catch(() => {
            // Offline / transient failure: keep the id; PATCH retries will
            // surface a save-failed state instead of silently duplicating.
          });
      }
    }
    setState((prev) => ({ ...prev, clientId: prev.clientId ?? newClientId() }));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    if (mode === "detailed") {
      setState((prev) => ({ ...prev, mode: "detailed" }));
    } else if (mode === "quick") {
      setState((prev) => ({ ...prev, mode: "quick" }));
    }
  }, []);

  const steps = useMemo(() => {
    return ALL_STEPS.filter((s) => {
      if (s.requires && !flags[s.requires]) return false;
      if (s.when && !s.when({ mode: state.mode, answers: state.answers, flags })) return false;
      return true;
    });
  }, [flags, state.mode, state.answers]);

  // If current step was filtered out, snap to nearest remaining step
  useEffect(() => {
    if (!hydrated || steps.length === 0) return;
    if (!steps.some((s) => s.id === state.currentStep)) {
      setState((prev) => ({ ...prev, currentStep: steps[0].id }));
    }
  }, [steps, state.currentStep, hydrated]);

  const current = useMemo(() => {
    const idx = steps.findIndex((s) => s.id === state.currentStep);
    return idx === -1 ? 0 : idx;
  }, [steps, state.currentStep]);

  const setAnswer = (key: string, value: string) => {
    setState((prev) => ({ ...prev, answers: { ...prev.answers, [key]: value } }));
  };

  // Debounced autosave: localStorage draft (always) + server draft (when a
  // project exists). Failures surface as a visible "save failed" state.
  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(async () => {
      saveDraft({
        mode: state.mode,
        currentStep: state.currentStep,
        answers: state.answers,
        projectId: state.projectId,
        referenceNumber: state.referenceNumber,
        clientId: state.clientId,
      });
      if (state.projectId) {
        setState((prev) => ({ ...prev, saving: true }));
        try {
          const res = await fetch(`/api/bathroom-projects/${state.projectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              currentStep: state.currentStep,
              answers: state.answers,
              plannerMode: state.mode,
            }),
          });
          if (!res.ok) throw new Error(`Save failed (${res.status})`);
          setState((prev) => ({ ...prev, saving: false, saveFailed: false, lastSavedAt: Date.now() }));
        } catch {
          setState((prev) => ({ ...prev, saving: false, saveFailed: true }));
        }
      }
    }, 800);
    return () => clearTimeout(t);
  }, [state.mode, state.currentStep, state.answers, state.projectId, state.referenceNumber, state.clientId, hydrated, saveNonce]);

  // Create the server-side draft project once the homeowner has entered
  // anything. clientGeneratedId keeps refreshes / double-mounts / extra tabs
  // from creating duplicate projects.
  useEffect(() => {
    if (!hydrated) return;
    if (state.projectId || !state.clientId) return;
    const hasAnyAnswer = Object.keys(state.answers).length > 0;
    if (!hasAnyAnswer) return;
    if (creatingRef.current) return;
    creatingRef.current = true;
    (async () => {
      try {
        const res = await fetch("/api/bathroom-projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plannerMode: state.mode,
            answers: state.answers,
            clientGeneratedId: state.clientId,
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { id: string; referenceNumber: string };
        setState((prev) =>
          prev.projectId
            ? prev
            : { ...prev, projectId: data.id, referenceNumber: data.referenceNumber },
        );
      } catch {
        // Network failure: keep answers locally; creation retries on next change.
      } finally {
        creatingRef.current = false;
      }
    })();
  }, [state.answers, state.mode, state.projectId, state.clientId, hydrated]);

  const goNext = () => {
    if (state.currentStep === "describe" && !hasCaptureContent(state.answers)) {
      setState((prev) => ({
        ...prev,
        error: "Add a short description, pick a room size, or upload a photo to continue.",
      }));
      return;
    }
    setState((prev) => ({ ...prev, error: null }));
    if (current < steps.length - 1) {
      setState((prev) => ({ ...prev, currentStep: steps[current + 1].id }));
    }
  };
  const goPrev = () => {
    if (current > 0) {
      setState((prev) => ({ ...prev, currentStep: steps[current - 1].id, error: null }));
    }
  };
  const goTo = (id: string) => {
    setState((prev) => ({ ...prev, currentStep: id, error: null }));
  };

  const reset = () => {
    if (!confirm("Clear your draft and start over?")) return;
    clearDraft();
    setState({
      ...INITIAL_STATE,
      mode: state.mode,
      clientId: newClientId(),
    });
  };

  const stepProps = {
    answers: state.answers,
    setAnswer,
    flags,
    projectId: state.projectId,
    referenceNumber: state.referenceNumber,
  };

  return (
    <div className="min-h-screen bg-bone-0">
      <header className="border-b border-ink-15 bg-bone-1">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4">
          <Link href={backHref} className="text-sm font-medium text-ink-70 hover:text-ink-100">
            ← Back to landing
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex rounded-full border border-ink-15 text-xs">
              <button
                type="button"
                onClick={() => setState((prev) => ({ ...prev, mode: "quick" }))}
                className={`rounded-full px-3 py-1 ${state.mode === "quick" ? "bg-accent text-bone-0" : "text-ink-70"}`}
              >
                Quick
              </button>
              <button
                type="button"
                onClick={() => setState((prev) => ({ ...prev, mode: "detailed" }))}
                className={`rounded-full px-3 py-1 ${state.mode === "detailed" ? "bg-accent text-bone-0" : "text-ink-70"}`}
              >
                Detailed
              </button>
            </div>
            <div className="text-xs text-ink-40">
              {state.referenceNumber ? `Ref: ${state.referenceNumber}` : "Draft"}
              {state.saving
                ? " · saving…"
                : state.saveFailed
                ? ""
                : state.lastSavedAt
                ? " · saved"
                : ""}
              {state.saveFailed && !state.saving && (
                <>
                  {" · "}
                  <span className="text-amber-700">couldn&apos;t save</span>{" "}
                  <button
                    type="button"
                    onClick={() => setSaveNonce((n) => n + 1)}
                    className="font-medium text-accent underline"
                  >
                    Retry
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-4 pb-4">
          <div className="h-1 w-full overflow-hidden rounded-full bg-ink-15">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${Math.round(((current + 1) / Math.max(steps.length, 1)) * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-ink-40">
            Step {current + 1} of {steps.length} · {state.mode} path · your progress saves automatically
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <ol className="mb-8 flex flex-wrap gap-2 text-xs">
          {steps.map((s, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => goTo(s.id)}
                  className={`rounded-full border px-3 py-1 transition ${
                    active
                      ? "border-accent bg-accent text-bone-0"
                      : done
                      ? "border-ink-40 text-ink-70"
                      : "border-ink-15 text-ink-40"
                  }`}
                >
                  {s.label}
                </button>
              </li>
            );
          })}
        </ol>

        <section className="rounded-xl border border-ink-15 bg-bone-1 p-6 sm:p-8">
          {state.currentStep === "describe" && <RequirementsPromptStep {...stepProps} />}
          {state.currentStep === "location" && <IntroStep {...stepProps} />}
          {state.currentStep === "measurements" && <MeasurementsStep {...stepProps} />}
          {state.currentStep === "layout" && state.projectId && (
            <LayoutWorkspace projectId={state.projectId} answers={state.answers} setAnswer={setAnswer} />
          )}
          {state.currentStep === "layout" && !state.projectId && (
            <p className="text-sm text-ink-70">
              Add a short description or room size on Capture so we can create your draft, then open Layout.
            </p>
          )}
          {state.currentStep === "fixtures_finishes" && <ScopeStep {...stepProps} />}
          {state.currentStep === "existing_conditions" && <ConditionsStep {...stepProps} />}
          {state.currentStep === "estimate" && <EstimateStep {...stepProps} />}
        </section>

        {state.error && <p className="mt-3 text-sm text-red-700">{state.error}</p>}

        <nav className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={goPrev}
            disabled={current === 0}
            className="rounded-lg border border-ink-15 px-4 py-2 text-sm text-ink-70 transition hover:border-ink-40 disabled:opacity-40"
          >
            ← Back
          </button>
          <button type="button" onClick={reset} className="text-xs text-ink-40 underline">
            Start over
          </button>
          {current < steps.length - 1 && (
            <button
              type="button"
              onClick={goNext}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bone-0 transition hover:opacity-90"
            >
              Continue →
            </button>
          )}
        </nav>
      </main>
    </div>
  );
}
