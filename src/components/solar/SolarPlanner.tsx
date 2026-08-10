"use client";

/**
 * Solar planner shell.
 *
 * Progressive by design (§38): the roof appears as soon as the building is
 * resolved, and the expensive downstream work (production modelling, cost,
 * incentives) streams in behind it rather than blocking on a spinner.
 *
 * Draft persistence mirrors the bathroom planner: localStorage always, server
 * draft once a project exists, visible save-failure with a retry, and a
 * resumed-draft validation that drops a dead project id instead of PATCHing it
 * forever.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { SolarFlags } from "@/lib/feature-flags";
import type { NormalizedAddress, RoofAnalysis, LayoutStrategy } from "@/lib/solar/types";
import {
  INITIAL_SOLAR_STATE,
  loadSolarDraft,
  saveSolarDraft,
  clearSolarDraft,
  newClientId,
  consumptionFromAnswers,
  costAnswersFrom,
  type SolarPlannerState,
  type PlanPayload,
} from "./planner-types";
import { RoofVisualizer, RoofDescription } from "./RoofVisualizer";
import { AddressStep, ConfirmBuildingStep } from "./steps/AddressStep";
import { EnergyStep, GoalStep } from "./steps/EnergyStep";
import { ManualRoofStep, type ManualFace } from "./steps/ManualRoofStep";
import { ResultsStep } from "./steps/ResultsStep";
import { RfpStep } from "./steps/RfpStep";
import { formatKw, formatKwhPerYear, formatPercent } from "@/lib/solar/formatters";

type StepId = "address" | "confirm" | "manual_roof" | "energy" | "goal" | "design" | "results" | "rfp";

interface StepDef {
  id: StepId;
  label: string;
  when?: (s: SolarPlannerState) => boolean;
}

const STEPS: StepDef[] = [
  { id: "address", label: "Address" },
  { id: "confirm", label: "Your roof", when: (s) => Boolean(s.analysis) && !s.analysis?.isManual },
  { id: "manual_roof", label: "Your roof", when: (s) => Boolean(s.roofFailure) || Boolean(s.analysis?.isManual) },
  { id: "energy", label: "Electricity" },
  { id: "goal", label: "Goal" },
  { id: "design", label: "Design" },
  { id: "results", label: "Results" },
];

/** Goal → starting layout strategy. The homeowner can override afterwards. */
function strategyForGoal(goal: string): { strategy: LayoutStrategy; targetOffsetFraction?: number } {
  switch (goal) {
    case "offset_100":
      return { strategy: "TARGET_OFFSET", targetOffsetFraction: 1 };
    case "maximize_roof":
      return { strategy: "MAXIMIZE_COUNT" };
    default:
      return { strategy: "MAXIMIZE_PRODUCTION" };
  }
}

export function SolarPlanner({
  flags,
  imageryStaleYears = 3,
  secondModelLabel = null,
}: {
  flags: SolarFlags;
  imageryStaleYears?: number;
  /** Label of the independent production model that will actually run, or null. */
  secondModelLabel?: string | null;
}) {
  const [state, setState] = useState<SolarPlannerState>(INITIAL_SOLAR_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [saveNonce, setSaveNonce] = useState(0);
  const [briefState, setBriefState] = useState({ generating: false, error: null as string | null });
  const creatingRef = useRef(false);
  const planAbortRef = useRef<AbortController | null>(null);

  // --- Hydrate --------------------------------------------------------------
  useEffect(() => {
    const draft = loadSolarDraft();
    if (draft) {
      setState((prev) => ({ ...prev, ...draft, saving: false, saveFailed: false, error: null }));

      if (draft.projectId) {
        const resumedId = draft.projectId;
        fetch(`/api/solar-projects/${resumedId}`)
          .then(async (res) => {
            if (!res.ok) {
              // The draft no longer exists: drop the id so a fresh project is
              // created rather than PATCHing a dead one forever.
              setState((prev) =>
                prev.projectId === resumedId ? { ...prev, projectId: null, referenceNumber: null } : prev,
              );
              return;
            }
            const data = await res.json();
            if (data.analysis) setState((prev) => ({ ...prev, analysis: data.analysis }));
          })
          .catch(() => {
            // Offline: keep the id. A failed PATCH will surface as save-failed.
          });
      }
    }
    setState((prev) => ({ ...prev, clientId: prev.clientId ?? newClientId() }));
    setHydrated(true);
  }, []);

  const steps = useMemo(() => STEPS.filter((s) => !s.when || s.when(state)), [state]);
  const currentIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === state.currentStep),
  );

  // Snap to a valid step if the current one was filtered out.
  useEffect(() => {
    if (!hydrated || steps.length === 0) return;
    if (!steps.some((s) => s.id === state.currentStep) && state.currentStep !== "rfp") {
      setState((prev) => ({ ...prev, currentStep: steps[0].id }));
    }
  }, [steps, state.currentStep, hydrated]);

  // --- Draft autosave -------------------------------------------------------
  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(async () => {
      saveSolarDraft({
        projectId: state.projectId,
        referenceNumber: state.referenceNumber,
        clientId: state.clientId,
        mode: state.mode,
        currentStep: state.currentStep,
        answers: state.answers,
        address: state.address,
        buildingConfirmed: state.buildingConfirmed,
        strategy: state.strategy,
        panelCount: state.panelCount,
        targetOffsetFraction: state.targetOffsetFraction,
        excludedSegments: state.excludedSegments,
        explicitPanelIds: state.explicitPanelIds,
      });

      if (!state.projectId) return;
      setState((prev) => ({ ...prev, saving: true }));
      try {
        const res = await fetch(`/api/solar-projects/${state.projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plannerMode: state.mode,
            currentStep: state.currentStep,
            answers: state.answers,
            projectGoal: state.answers.project_goal,
          }),
        });
        if (!res.ok) throw new Error(String(res.status));
        setState((prev) => ({ ...prev, saving: false, saveFailed: false, lastSavedAt: Date.now() }));
      } catch {
        setState((prev) => ({ ...prev, saving: false, saveFailed: true }));
      }
    }, 800);
    return () => clearTimeout(t);
    // The design fields belong here too: without them, a homeowner who only
    // moved the panel slider or switched a roof face off would lose those
    // choices on refresh, because nothing else in the dep list changed.
  }, [
    state.mode,
    state.currentStep,
    state.answers,
    state.projectId,
    state.referenceNumber,
    state.clientId,
    state.address,
    state.buildingConfirmed,
    state.strategy,
    state.panelCount,
    state.targetOffsetFraction,
    state.excludedSegments,
    state.explicitPanelIds,
    hydrated,
    saveNonce,
  ]);

  // --- Create the server draft once there is anything worth saving ----------
  const ensureProject = useCallback(async (): Promise<string | null> => {
    if (state.projectId) return state.projectId;
    if (!state.clientId || creatingRef.current) return null;
    creatingRef.current = true;
    try {
      const res = await fetch("/api/solar-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plannerMode: state.mode, clientGeneratedId: state.clientId }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      setState((prev) => (prev.projectId ? prev : { ...prev, projectId: data.id, referenceNumber: data.referenceNumber }));
      return data.id as string;
    } catch {
      return null;
    } finally {
      creatingRef.current = false;
    }
  }, [state.projectId, state.clientId, state.mode]);

  const setAnswer = (key: string, value: string) =>
    setState((prev) => ({ ...prev, answers: { ...prev.answers, [key]: value } }));

  // --- Address + roof analysis ---------------------------------------------
  const runRoofAnalysis = useCallback(
    async (projectId: string, location: { latitude: number; longitude: number }) => {
      setState((prev) => ({ ...prev, computing: true, roofFailure: null, error: null }));
      try {
        const res = await fetch(`/api/solar-projects/${projectId}/roof-analysis`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "provider", location }),
        });
        const data = await res.json();
        if (!res.ok) {
          setState((prev) => ({
            ...prev,
            computing: false,
            roofFailure: {
              reason: "PROVIDER_UNAVAILABLE",
              message: data.error ?? "Roof analysis failed.",
              recovery: "MANUAL_ROOF",
              retryable: true,
            },
            currentStep: "manual_roof",
          }));
          return;
        }
        setState((prev) => ({
          ...prev,
          computing: false,
          analysis: data.analysis ?? null,
          roofFailure: data.failure ?? null,
          currentStep: data.failure ? "manual_roof" : "confirm",
        }));
      } catch {
        setState((prev) => ({
          ...prev,
          computing: false,
          roofFailure: {
            reason: "NETWORK",
            message: "We couldn't reach the roof analysis service.",
            recovery: "MANUAL_ROOF",
            retryable: true,
          },
          currentStep: "manual_roof",
        }));
      }
    },
    [],
  );

  const handleAddressSelected = async (address: NormalizedAddress) => {
    const projectId = await ensureProject();
    setState((prev) => ({ ...prev, address, buildingConfirmed: false }));
    if (!projectId) {
      setState((prev) => ({
        ...prev,
        error: "We couldn't save your project. Check your connection and try again.",
      }));
      return;
    }
    await fetch(`/api/solar-projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: {
          formattedAddress: address.formatted,
          streetLine: address.streetLine,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          county: address.county,
          location: address.location,
          geocodeQuality: address.locationQuality,
        },
      }),
    }).catch(() => undefined);

    await runRoofAnalysis(projectId, address.location);
  };

  const handleManualRoof = async (faces: ManualFace[]) => {
    const projectId = await ensureProject();
    if (!projectId || !state.address) return;
    setState((prev) => ({ ...prev, computing: true }));
    try {
      const res = await fetch(`/api/solar-projects/${projectId}/roof-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "manual", location: state.address.location, faces }),
      });
      const data = await res.json();
      setState((prev) => ({
        ...prev,
        computing: false,
        analysis: data.analysis ?? null,
        roofFailure: null,
        buildingConfirmed: true,
        currentStep: "energy",
      }));
    } catch {
      setState((prev) => ({ ...prev, computing: false, error: "We couldn't save your roof description." }));
    }
  };

  // --- Plan computation -----------------------------------------------------
  const computePlan = useCallback(
    async (persist: boolean) => {
      if (!state.projectId) return;
      // Cancel any in-flight preview so a fast slider drag cannot land results
      // out of order.
      planAbortRef.current?.abort();
      const controller = new AbortController();
      planAbortRef.current = controller;

      setState((prev) => ({ ...prev, computing: true }));
      try {
        const res = await fetch(`/api/solar-projects/${state.projectId}/plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            strategy: state.strategy,
            panelCount: state.panelCount ?? undefined,
            targetOffsetFraction: state.targetOffsetFraction ?? undefined,
            excludedSegmentIndices: state.excludedSegments,
            explicitPanelIds: state.strategy === "MANUAL" ? (state.explicitPanelIds ?? []) : undefined,
            consumption: consumptionFromAnswers(state.answers),
            answers: costAnswersFrom(state.answers),
            electricalInfoComplete: Boolean(state.answers.main_panel_rating),
            persist,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setState((prev) => ({ ...prev, computing: false, error: data.error ?? "We couldn't build your plan." }));
          return;
        }
        setState((prev) => ({
          ...prev,
          computing: false,
          plan: data.plan as PlanPayload,
          // Adopt the engine's selection so the canvas matches the numbers.
          explicitPanelIds: data.plan.selectedPanelIds,
          error: null,
        }));
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setState((prev) => ({ ...prev, computing: false, error: "We couldn't build your plan. Try again." }));
      }
    },
    [
      state.projectId,
      state.strategy,
      state.panelCount,
      state.targetOffsetFraction,
      state.excludedSegments,
      state.explicitPanelIds,
      state.answers,
    ],
  );

  // `computePlan` is rebuilt whenever the design inputs change, including
  // `explicitPanelIds` — which this effect writes back. Depending on its
  // identity would loop forever, so the effect reads the latest version
  // through a ref instead. That keeps the dependency list honest (no lint
  // suppression) while ruling out a stale closure.
  const computePlanRef = useRef(computePlan);
  useEffect(() => {
    computePlanRef.current = computePlan;
  }, [computePlan]);

  // Recompute the plan whenever the design inputs change, debounced so the
  // slider feels immediate without hammering the metered APIs.
  useEffect(() => {
    if (!hydrated || !state.analysis || !state.projectId) return;
    if (state.currentStep !== "design" && state.currentStep !== "results") return;
    const t = setTimeout(() => void computePlanRef.current(false), 350);
    return () => clearTimeout(t);
  }, [
    hydrated,
    state.analysis,
    state.projectId,
    state.currentStep,
    state.strategy,
    state.panelCount,
    state.excludedSegments,
    state.targetOffsetFraction,
    // Usage answers feed the consumption model, so an edited bill figure must
    // re-derive the offset. Deliberately excludes explicitPanelIds, which this
    // effect writes back via the plan response.
    state.answers,
  ]);

  // --- Brief + RFP ----------------------------------------------------------
  const handleRequestProposals = async () => {
    if (!state.projectId) return;
    setBriefState({ generating: true, error: null });
    try {
      // Persist the plan the homeowner is looking at, then snapshot the brief.
      await computePlan(true);
      const res = await fetch(`/api/solar-projects/${state.projectId}/brief`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setBriefState({ generating: false, error: data.error ?? "We couldn't prepare your brief." });
        return;
      }
      setBriefState({ generating: false, error: null });
      setState((prev) => ({ ...prev, currentStep: "rfp" }));
    } catch {
      setBriefState({ generating: false, error: "We couldn't prepare your brief. Try again." });
    }
  };

  const selectedIds = useMemo(() => new Set(state.explicitPanelIds ?? []), [state.explicitPanelIds]);
  const excludedSet = useMemo(() => new Set(state.excludedSegments), [state.excludedSegments]);

  const togglePanel = (panelId: string) => {
    setState((prev) => {
      const next = new Set(prev.explicitPanelIds ?? []);
      if (next.has(panelId)) next.delete(panelId);
      else next.add(panelId);
      return { ...prev, strategy: "MANUAL", explicitPanelIds: [...next] };
    });
  };

  const toggleSegment = (segmentIndex: number) => {
    setState((prev) => {
      const next = new Set(prev.excludedSegments);
      if (next.has(segmentIndex)) next.delete(segmentIndex);
      else next.add(segmentIndex);
      // Excluding a face invalidates a manual selection; fall back to the
      // strategy so the layout is recomputed against the remaining faces.
      return {
        ...prev,
        excludedSegments: [...next],
        strategy: prev.strategy === "MANUAL" ? "MAXIMIZE_PRODUCTION" : prev.strategy,
        explicitPanelIds: prev.strategy === "MANUAL" ? null : prev.explicitPanelIds,
      };
    });
  };

  const reset = () => {
    if (!confirm("Clear your solar plan and start over?")) return;
    clearSolarDraft();
    setState({ ...INITIAL_SOLAR_STATE, clientId: newClientId() });
  };

  const goTo = (id: StepId) => setState((prev) => ({ ...prev, currentStep: id, error: null }));

  const showCanvas =
    state.analysis && ["confirm", "design", "results"].includes(state.currentStep) && state.analysis.segments.length > 0;

  return (
    <div className="min-h-screen bg-bone-0">
      <header className="sticky top-0 z-20 border-b border-ink-15 bg-bone-1/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/solar" className="text-sm font-medium text-ink-70 hover:text-ink-100">
            ← Solar
          </Link>
          <div className="flex items-center gap-3 text-xs text-ink-40">
            {state.referenceNumber ? `Ref: ${state.referenceNumber}` : "Draft"}
            {state.saving ? " · saving…" : state.lastSavedAt && !state.saveFailed ? " · saved" : ""}
            {state.saveFailed && (
              <>
                <span className="text-amber-700">couldn&rsquo;t save</span>
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

        <div className="mx-auto max-w-6xl px-4 pb-3">
          <ol className="flex flex-wrap gap-2 text-xs">
            {steps.map((s, i) => {
              const active = s.id === state.currentStep;
              const done = i < currentIndex;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => goTo(s.id)}
                    aria-current={active ? "step" : undefined}
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
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {/* The roof canvas dominates once there is a roof to show (§67). */}
        {showCanvas && state.analysis && (
          <section className="mb-8 overflow-hidden rounded-xl border border-ink-15 bg-white">
            <RoofVisualizer
              analysis={state.analysis}
              selectedPanelIds={selectedIds}
              excludedSegments={excludedSet}
              onTogglePanel={state.currentStep === "design" ? togglePanel : undefined}
              onToggleSegment={state.currentStep === "design" ? toggleSegment : undefined}
              imageryEnabled={flags.imagery && !state.analysis.isManual}
            />
            {state.plan && (
              <div className="grid grid-cols-2 gap-4 border-t border-ink-15 px-4 py-3 text-sm sm:grid-cols-4">
                <Stat label="System" value={formatKw(state.plan.system.dcSystemSizeKw.value)} />
                <Stat label="Panels" value={String(state.plan.system.panelCount.value)} />
                <Stat
                  label="Production"
                  value={
                    state.plan.production.annualAcKwh
                      ? formatKwhPerYear(state.plan.production.annualAcKwh.value)
                      : "—"
                  }
                />
                <Stat
                  label="Offset"
                  value={state.plan.offsetPercent ? formatPercent(state.plan.offsetPercent.value) : "—"}
                />
              </div>
            )}
          </section>
        )}

        <section className="rounded-xl border border-ink-15 bg-bone-1 p-5 sm:p-8">
          {state.currentStep === "address" && (
            <AddressStep
              address={state.address}
              onSelect={handleAddressSelected}
              onManualCoordinates={(latitude, longitude) =>
                handleAddressSelected({
                  formatted: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
                  location: { latitude, longitude },
                  locationQuality: "UNKNOWN",
                })
              }
            />
          )}

          {state.currentStep === "confirm" && state.analysis && (
            <>
              <ConfirmBuildingStep
                address={state.address}
                analysis={state.analysis}
                imageryStaleYears={imageryStaleYears}
                propertyChanged={state.answers.property_changed_since_imagery === "yes"}
                onPropertyChanged={(changed) =>
                  setAnswer("property_changed_since_imagery", changed ? "yes" : "no")
                }
                onConfirm={async () => {
                  setState((prev) => ({ ...prev, buildingConfirmed: true, currentStep: "energy" }));
                  if (state.projectId) {
                    await fetch(`/api/solar-projects/${state.projectId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        buildingConfirmation: {
                          confirmed: true,
                          propertyChangedSinceImagery: state.answers.property_changed_since_imagery === "yes",
                        },
                      }),
                    }).catch(() => undefined);
                  }
                }}
                onReject={async () => {
                  setState((prev) => ({
                    ...prev,
                    buildingConfirmed: false,
                    roofFailure: {
                      reason: "WRONG_BUILDING",
                      message:
                        "No problem — we won't use that building. Describe your roof instead and we'll model production from your answers.",
                      recovery: "MANUAL_ROOF",
                      retryable: false,
                    },
                    currentStep: "manual_roof",
                  }));
                  if (state.projectId) {
                    await fetch(`/api/solar-projects/${state.projectId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ buildingConfirmation: { confirmed: false } }),
                    }).catch(() => undefined);
                  }
                }}
              />
              <div className="mt-8 border-t border-ink-15 pt-6">
                <h3 className="text-sm font-semibold text-ink-100">Your roof faces</h3>
                <div className="mt-3">
                  <RoofDescription
                    analysis={state.analysis}
                    selectedPanelIds={selectedIds}
                    excludedSegments={excludedSet}
                  />
                </div>
              </div>
            </>
          )}

          {state.currentStep === "manual_roof" && (
            <ManualRoofStep
              reason={state.roofFailure?.message ?? "Let's capture your roof manually."}
              retryable={state.roofFailure?.retryable ?? false}
              onRetryProvider={
                state.address && state.projectId
                  ? () => void runRoofAnalysis(state.projectId!, state.address!.location)
                  : undefined
              }
              onSubmit={handleManualRoof}
            />
          )}

          {state.currentStep === "energy" && <EnergyStep answers={state.answers} setAnswer={setAnswer} />}

          {state.currentStep === "goal" && (
            <GoalStep
              answers={state.answers}
              setAnswer={setAnswer}
              onStrategyChange={(goal) => {
                const { strategy, targetOffsetFraction } = strategyForGoal(goal);
                setState((prev) => ({
                  ...prev,
                  strategy,
                  targetOffsetFraction: targetOffsetFraction ?? null,
                  explicitPanelIds: null,
                }));
              }}
            />
          )}

          {state.currentStep === "design" && state.analysis && state.analysis.candidatePanels.length > 0 && (
            <DesignControls
              analysis={state.analysis}
              state={state}
              selectedIds={selectedIds}
              excludedSet={excludedSet}
              onToggleSegment={toggleSegment}
              onPanelCount={(n) =>
                setState((prev) => ({
                  ...prev,
                  strategy: "MAXIMIZE_PRODUCTION",
                  panelCount: n,
                  explicitPanelIds: null,
                }))
              }
            />
          )}

          {state.currentStep === "results" && state.plan && (
            <ResultsStep
              plan={state.plan}
              analysis={state.analysis}
              briefState={briefState}
              onAdjust={() => goTo("design")}
              onRequestProposals={handleRequestProposals}
            />
          )}

          {/* Analysis ran but found nothing to place — a real answer, not a
              failure, and distinct from having no analysis at all. */}
          {state.currentStep === "design" &&
            state.analysis &&
            state.analysis.candidatePanels.length === 0 && (
              <NoSuitableRoofNotice onManual={() => goTo("manual_roof")} />
            )}

          {/* Every step that depends on a roof analysis needs a way forward
              when there isn't one. A resumed draft whose server project is
              gone lands here, and rendering nothing is a dead end (§57). */}
          {(state.currentStep === "design" || state.currentStep === "results") && !state.analysis && (
            <NeedsRoofNotice
              computing={state.computing}
              hasAddress={Boolean(state.address)}
              onRestartAddress={() => goTo("address")}
              onRetryAnalysis={
                state.address && state.projectId
                  ? () => void runRoofAnalysis(state.projectId!, state.address!.location)
                  : undefined
              }
            />
          )}

          {state.currentStep === "results" && state.analysis && !state.plan && (
            <p className="text-sm text-ink-70">
              {state.computing ? "Building your plan…" : "Add your roof and usage to see results."}
            </p>
          )}

          {state.currentStep === "rfp" && state.projectId && (
            <RfpStep
              projectId={state.projectId}
              defaultZip={state.address?.postalCode ?? ""}
              plan={state.plan}
              onBack={() => goTo("results")}
            />
          )}
        </section>

        {state.error && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {state.error}
          </p>
        )}

        {state.currentStep !== "rfp" && (
          <nav className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => currentIndex > 0 && goTo(steps[currentIndex - 1].id)}
              disabled={currentIndex === 0}
              className="rounded-lg border border-ink-15 px-4 py-2 text-sm text-ink-70 transition hover:border-ink-40 disabled:opacity-40"
            >
              ← Back
            </button>
            <button type="button" onClick={reset} className="text-xs text-ink-40 underline">
              Start over
            </button>
            {currentIndex < steps.length - 1 && (
              <button
                type="button"
                onClick={() => goTo(steps[currentIndex + 1].id)}
                disabled={state.currentStep === "address" && !state.analysis}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bone-0 transition hover:opacity-90 disabled:opacity-40"
              >
                Continue →
              </button>
            )}
          </nav>
        )}

        {/* Reflects the model that will actually run, not a flag. PVWatts being
            off is not the same as having no second model — PVGIS covers it and
            needs no credential. */}
        {!secondModelLabel && (
          <p className="mt-6 text-xs text-ink-40">
            No independent production model is available in this environment, so production is shown from a single
            model with a wider range.
          </p>
        )}
      </main>
    </div>
  );
}

/**
 * Shown when a step that needs roof geometry is reached without it — most
 * often a returning homeowner whose saved draft points at a project that no
 * longer exists on the server. Always offers a way forward.
 */
function NeedsRoofNotice({
  computing,
  hasAddress,
  onRestartAddress,
  onRetryAnalysis,
}: {
  computing: boolean;
  hasAddress: boolean;
  onRestartAddress: () => void;
  onRetryAnalysis?: () => void;
}) {
  if (computing) {
    return <p className="text-sm text-ink-70">Analysing your roof…</p>;
  }
  return (
    <div>
      <h2 className="text-xl font-semibold text-ink-100">We need your roof first</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-70">
        {hasAddress
          ? "We don't have a roof analysis for this plan any more — saved plans expire after a while. Your answers are still here; we just need to look at the roof again."
          : "Start by telling us where your home is, and we'll analyse the roof from there."}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        {onRetryAnalysis ? (
          <>
            <button type="button" onClick={onRetryAnalysis} className="landing-btn-primary">
              Analyse my roof again
            </button>
            <button type="button" onClick={onRestartAddress} className="landing-btn-ghost">
              Use a different address
            </button>
          </>
        ) : (
          // No project to retry against, so the address step is the route back.
          // It arrives pre-filled, so this is one click for the homeowner.
          <button type="button" onClick={onRestartAddress} className="landing-btn-primary">
            {hasAddress ? "Look at my roof again" : "Enter my address"}
          </button>
        )}
      </div>
    </div>
  );
}

/** Roof analysis succeeded but found nothing usable — distinct from having none. */
function NoSuitableRoofNotice({ onManual }: { onManual: () => void }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-ink-100">No suitable panel positions on this roof</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-70">
        The aerial analysis didn&rsquo;t find roof area suitable for panels. That can happen with heavy shade, a very
        small roof, or an unusual roof shape — it doesn&rsquo;t necessarily mean solar is off the table. You can
        describe your roof yourself, or send the project to installers to assess on site.
      </p>
      <button type="button" onClick={onManual} className="landing-btn-primary mt-5">
        Describe my roof instead
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="landing-eyebrow">{label}</div>
      <div className="mt-0.5 font-semibold text-ink-100">{value}</div>
    </div>
  );
}

function DesignControls({
  analysis,
  state,
  selectedIds,
  excludedSet,
  onToggleSegment,
  onPanelCount,
}: {
  analysis: RoofAnalysis;
  state: SolarPlannerState;
  selectedIds: Set<string>;
  excludedSet: Set<number>;
  onToggleSegment: (i: number) => void;
  onPanelCount: (n: number) => void;
}) {
  const available = analysis.candidatePanels.filter((p) => !excludedSet.has(p.segmentIndex)).length;
  const current = state.plan?.system.panelCount.value ?? selectedIds.size;

  return (
    <div>
      <h2 className="text-xl font-semibold text-ink-100">Adjust your system</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-70">
        Drag the slider, switch roof faces off, or click individual panels on the roof above. Everything updates as you
        go.
      </p>

      <div className="mt-6">
        <label className="landing-label" htmlFor="panel-count">
          Number of panels — {current} of {available} available
        </label>
        <input
          id="panel-count"
          type="range"
          min={0}
          max={available}
          value={Math.min(current, available)}
          onChange={(e) => onPanelCount(Number(e.target.value))}
          className="mt-2 w-full accent-[#c17a2a]"
        />
        <div className="mt-1 flex justify-between text-xs text-ink-40">
          <span>0</span>
          <span>{available} (full suitable roof)</span>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-semibold text-ink-100">Roof faces</h3>
        <p className="mt-1 text-xs text-ink-40">
          Turn a face off if you&rsquo;d rather not have panels there — for looks, a planned skylight, or anything else.
        </p>
        <div className="mt-3">
          <RoofDescription
            analysis={analysis}
            selectedPanelIds={selectedIds}
            excludedSegments={excludedSet}
            onToggleSegment={onToggleSegment}
          />
        </div>
      </div>

      {state.plan?.layoutNotes && state.plan.layoutNotes.length > 0 && (
        <ul className="mt-6 space-y-2 rounded-lg border border-ink-15 bg-white p-4 text-sm text-ink-70">
          {state.plan.layoutNotes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
