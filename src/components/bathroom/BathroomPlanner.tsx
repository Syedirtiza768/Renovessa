"use client";

import { useEffect, useMemo, useState } from "react";
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

export function BathroomPlanner({ flags, backHref = "/bathroom-remodeling/rockville-md" }: { flags: BathroomFlags; backHref?: string }) {
  const [state, setState] = useState<PlannerState>({
    projectId: null,
    referenceNumber: null,
    mode: "quick",
    currentStep: "describe",
    answers: {},
    saving: false,
    lastSavedAt: null,
    error: null,
  });
  const [hydrated, setHydrated] = useState(false);

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
        error: null,
      }));
    }
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
  const progress = useMemo(
    () => Math.round(((current + 1) / Math.max(steps.length, 1)) * 100),
    [current, steps.length],
  );

  const setAnswer = (key: string, value: string) => {
    setState((prev) => ({ ...prev, answers: { ...prev.answers, [key]: value } }));
  };

  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(async () => {
      saveDraft({ mode: state.mode, currentStep: state.currentStep, answers: state.answers });
      if (state.projectId) {
        setState((prev) => ({ ...prev, saving: true }));
        try {
          await fetch(`/api/bathroom-projects/${state.projectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              currentStep: state.currentStep,
              answers: state.answers,
              plannerMode: state.mode,
            }),
          });
          setState((prev) => ({ ...prev, saving: false, lastSavedAt: Date.now() }));
        } catch {
          setState((prev) => ({ ...prev, saving: false }));
        }
      }
    }, 800);
    return () => clearTimeout(t);
  }, [state.mode, state.currentStep, state.answers, state.projectId, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (state.projectId) return;
    const hasAnyAnswer = Object.keys(state.answers).length > 0;
    if (!hasAnyAnswer) return;
    (async () => {
      try {
        const res = await fetch("/api/bathroom-projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plannerMode: state.mode,
            answers: state.answers,
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { id: string; referenceNumber: string };
        setState((prev) => ({ ...prev, projectId: data.id, referenceNumber: data.referenceNumber }));
      } catch {
        // ignore
      }
    })();
  }, [state.answers, state.mode, state.projectId, hydrated]);

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
      projectId: null,
      referenceNumber: null,
      mode: state.mode,
      currentStep: "describe",
      answers: {},
      saving: false,
      lastSavedAt: null,
      error: null,
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
              {state.saving ? " · saving…" : state.lastSavedAt ? " · saved" : ""}
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-4 pb-4">
          <div className="h-1 w-full overflow-hidden rounded-full bg-ink-15">
            <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-ink-40">{progress}% complete · {state.mode} path</p>
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
          <button
            type="button"
            onClick={goNext}
            disabled={current === steps.length - 1}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bone-0 transition hover:opacity-90 disabled:opacity-40"
          >
            Continue →
          </button>
        </nav>
      </main>
    </div>
  );
}
