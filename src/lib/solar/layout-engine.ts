/**
 * Panel selection and system sizing (§13, §14, E1–E2).
 *
 * The engine only ever *selects from* provider-supplied candidate positions.
 * It never invents a position, a roof plane, or a panel wattage. Selection is
 * a stable deterministic sort — not an optimiser with hidden state — so the
 * same inputs always produce the same layout, which is what makes a saved
 * estimate reproducible.
 */

import type {
  RoofAnalysis,
  CandidatePanel,
  PanelLayoutSelection,
  LayoutStrategy,
  SystemSize,
  SegmentProductionInput,
} from "./types";
import { fromApi, fromCalculation } from "./provenance";
import { LAYOUT_ENGINE_VERSION } from "./versions";

/**
 * Stable ordering: production desc, then segment, then position. The tiebreak
 * chain has no ties left, so selection is reproducible across runs and hosts.
 */
export function rankCandidates(panels: CandidatePanel[]): CandidatePanel[] {
  return [...panels].sort((a, b) => {
    if (b.yearlyEnergyDcKwh !== a.yearlyEnergyDcKwh) return b.yearlyEnergyDcKwh - a.yearlyEnergyDcKwh;
    if (a.segmentIndex !== b.segmentIndex) return a.segmentIndex - b.segmentIndex;
    if (a.center.latitude !== b.center.latitude) return a.center.latitude - b.center.latitude;
    if (a.center.longitude !== b.center.longitude) return a.center.longitude - b.center.longitude;
    return a.id.localeCompare(b.id);
  });
}

export interface SelectPanelsInput {
  analysis: RoofAnalysis;
  strategy: LayoutStrategy;
  excludedSegmentIndices?: number[];
  /** MAXIMIZE_PRODUCTION / MANUAL: how many panels. */
  panelCount?: number;
  /** TARGET_OFFSET: 0–1 fraction of annual consumption to cover. */
  targetOffsetFraction?: number;
  /** TARGET_OFFSET: required. Without it the strategy cannot be honoured. */
  annualConsumptionKwh?: number;
  /** MANUAL: explicit ids the homeowner toggled. */
  explicitPanelIds?: string[];
  /**
   * DC→AC derate used only to decide when a TARGET_OFFSET goal is met, since
   * candidate energies are DC and consumption is compared against AC.
   */
  dcToAcDerate: number;
}

export interface SelectPanelsResult {
  selection: PanelLayoutSelection;
  selectedPanels: CandidatePanel[];
  /** Set when the requested strategy could not be honoured as asked. */
  notes: string[];
}

export function selectPanels(input: SelectPanelsInput): SelectPanelsResult {
  const excluded = new Set(input.excludedSegmentIndices ?? []);
  const available = input.analysis.candidatePanels.filter((p) => !excluded.has(p.segmentIndex));
  const notes: string[] = [];

  let selected: CandidatePanel[] = [];

  switch (input.strategy) {
    case "MANUAL": {
      const wanted = new Set(input.explicitPanelIds ?? []);
      // Preserve rank order so downstream aggregation stays deterministic even
      // when the homeowner clicked panels in an arbitrary order.
      selected = rankCandidates(available).filter((p) => wanted.has(p.id));
      const missing = (input.explicitPanelIds ?? []).length - selected.length;
      if (missing > 0) {
        notes.push(
          `${missing} previously selected panel position${missing === 1 ? " is" : "s are"} no longer available in the current roof analysis and ${missing === 1 ? "was" : "were"} dropped.`,
        );
      }
      break;
    }

    case "MAXIMIZE_COUNT": {
      selected = rankCandidates(available);
      break;
    }

    case "TARGET_OFFSET": {
      const target = input.targetOffsetFraction ?? 1;
      const consumption = input.annualConsumptionKwh;
      const ranked = rankCandidates(available);

      if (!consumption || consumption <= 0) {
        // Honesty over convenience: without a consumption figure there is no
        // offset to target, so fall back to the whole roof and say so.
        notes.push(
          "We don't have your electricity usage yet, so this layout uses the full suitable roof instead of targeting an offset.",
        );
        selected = ranked;
        break;
      }

      const goalAcKwh = consumption * target;
      let runningAc = 0;
      for (const panel of ranked) {
        if (runningAc >= goalAcKwh) break;
        selected.push(panel);
        runningAc += panel.yearlyEnergyDcKwh * input.dcToAcDerate;
      }
      if (runningAc < goalAcKwh) {
        notes.push(
          `Your roof's suitable area can't reach ${Math.round(target * 100)}% offset — this layout uses every suitable position.`,
        );
      }
      break;
    }

    case "MAXIMIZE_PRODUCTION":
    default: {
      const ranked = rankCandidates(available);
      const count = input.panelCount ?? ranked.length;
      selected = ranked.slice(0, Math.max(0, Math.min(count, ranked.length)));
      if (input.panelCount !== undefined && input.panelCount > ranked.length) {
        notes.push(
          `Only ${ranked.length} suitable panel position${ranked.length === 1 ? "" : "s"} exist on the selected roof faces.`,
        );
      }
      break;
    }
  }

  return {
    selection: {
      strategy: input.strategy,
      selectedPanelIds: selected.map((p) => p.id),
      excludedSegmentIndices: [...excluded].sort((a, b) => a - b),
      targetOffsetFraction: input.strategy === "TARGET_OFFSET" ? input.targetOffsetFraction : undefined,
    },
    selectedPanels: selected,
    notes,
  };
}

/**
 * E1. System size.
 *
 * `panelCapacityWatts` comes from the analysis — the provider's layout model
 * or a catalog module. Never a nominal 400 W.
 */
export function computeSystemSize(analysis: RoofAnalysis, panelCount: number): SystemSize {
  const capacityWatts = analysis.panelSpec.capacityWatts;
  const dcKw = (panelCount * capacityWatts) / 1000;

  const capacitySourceName =
    analysis.panelSpec.source === "equipment_catalog"
      ? `Equipment catalog — ${[analysis.panelSpec.manufacturer, analysis.panelSpec.model].filter(Boolean).join(" ") || "selected module"}`
      : `${analysis.providerId} layout model`;

  return {
    panelCount: fromCalculation(panelCount, {
      unit: "panels",
      calculationVersion: LAYOUT_ENGINE_VERSION,
      explanation: `Based on ${panelCount} conceptual panel position${panelCount === 1 ? "" : "s"} on the roof faces you've selected.`,
      derivedFrom: ["roof analysis", "your layout selection"],
    }),
    panelCapacityWatts: fromApi(capacityWatts, {
      unit: "W",
      sourceName: capacitySourceName,
      confidence: analysis.panelSpec.source === "equipment_catalog" ? "HIGH" : "MEDIUM",
      retrievedAt: analysis.retrievedAt,
      explanation:
        analysis.panelSpec.source === "equipment_catalog"
          ? "The rated output of the module you selected."
          : "The planning module rating used by the roof layout model. Your installer's actual module may differ.",
    }),
    dcSystemSizeKw: fromCalculation(dcKw, {
      unit: "kW DC",
      calculationVersion: LAYOUT_ENGINE_VERSION,
      explanation: `${panelCount} panels × ${capacityWatts} W = ${dcKw.toFixed(2)} kW of rated panel capacity.`,
      derivedFrom: ["panel count", "panel capacity"],
    }),
  };
}

/**
 * Group the selected panels by roof segment so each plane can be modelled with
 * its own tilt and azimuth (§16 — no averaged geometry).
 */
export function buildSegmentProductionInputs(
  analysis: RoofAnalysis,
  selectedPanels: CandidatePanel[],
  minTiltDegrees: number,
): SegmentProductionInput[] {
  const bySegment = new Map<number, number>();
  for (const p of selectedPanels) {
    bySegment.set(p.segmentIndex, (bySegment.get(p.segmentIndex) ?? 0) + 1);
  }

  const inputs: SegmentProductionInput[] = [];
  for (const [segmentIndex, panelCount] of [...bySegment.entries()].sort((a, b) => a[0] - b[0])) {
    const segment = analysis.segments.find((s) => s.index === segmentIndex);
    if (!segment) continue;
    inputs.push({
      segmentIndex,
      panelCount,
      capacityKw: (panelCount * analysis.panelSpec.capacityWatts) / 1000,
      tiltDegrees: segment.pitchDegrees,
      azimuthDegrees: segment.azimuthDegrees,
      location: segment.center,
      tiltWasAdjusted: segment.pitchDegrees < minTiltDegrees,
    });
  }
  return inputs;
}

/** How much of the roof's suitable capacity this layout uses (§18). */
export function roofUsage(analysis: RoofAnalysis, selectedCount: number) {
  const max = Math.max(analysis.maxPanelCount, selectedCount, 0);
  return {
    usedPanelCount: selectedCount,
    maxPanelCount: analysis.maxPanelCount,
    percentOfSuitableRoofUsed: max === 0 ? 0 : (selectedCount / max) * 100,
  };
}
