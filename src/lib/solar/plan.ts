/**
 * Plan orchestrator.
 *
 * Composes the deterministic engines into one `SolarPlanResult`. Provider I/O
 * happens in the route handler and is passed in as already-normalized data, so
 * this stays a pure function that tests can drive end-to-end with fixtures.
 */

import type {
  RoofAnalysis,
  SolarPlanResult,
  ConsumptionInput,
  IncentiveProgram,
  ProductionModelOutput,
  ProductionModelId,
  LayoutStrategy,
} from "./types";
import { selectPanels, computeSystemSize, roofUsage } from "./layout-engine";
import { reconcileProduction, providerProductionModel, computeOffsetPercent } from "./production";
import { deriveConsumption } from "./consumption";
import { generateCostEstimate, type CostAnswerFlags } from "./cost-engine";
import { scorePlanningConfidence } from "./confidence";
import type { SolarPricingConfig } from "./pricing-config";

export interface BuildPlanInput {
  config: SolarPricingConfig;
  analysis: RoofAnalysis | null;
  buildingConfirmed: boolean;
  propertyChangedSinceImagery?: boolean;

  strategy: LayoutStrategy;
  panelCount?: number;
  targetOffsetFraction?: number;
  excludedSegmentIndices?: number[];
  explicitPanelIds?: string[];

  consumption: ConsumptionInput;

  /**
   * PVWatts output, already fetched by the caller. Absent when the model was
   * unavailable — the plan then runs single-model and says so.
   */
  pvwattsOutput?: ProductionModelOutput | null;
  pvwattsFailure?: string | null;

  answers: CostAnswerFlags;
  electricalInfoComplete: boolean;

  incentives: IncentiveProgram[];
  incentiveLookupFailed: boolean;
}

export interface BuildPlanOutput extends SolarPlanResult {
  selectedPanelIds: string[];
  layoutNotes: string[];
}

export function buildPlan(input: BuildPlanInput): BuildPlanOutput {
  const { config } = input;
  const derate = config.production.dcToAcDerate;

  // 1. Consumption first — TARGET_OFFSET needs it.
  const consumption = deriveConsumption(input.consumption);
  const annualConsumption = consumption.annualKwh?.value ?? null;

  // 2. Layout.
  const emptyAnalysis = !input.analysis;
  const layout = input.analysis
    ? selectPanels({
        analysis: input.analysis,
        strategy: input.strategy,
        excludedSegmentIndices: input.excludedSegmentIndices,
        panelCount: input.panelCount,
        targetOffsetFraction: input.targetOffsetFraction,
        annualConsumptionKwh: annualConsumption ?? undefined,
        explicitPanelIds: input.explicitPanelIds,
        dcToAcDerate: derate,
      })
    : null;

  const selectedPanels = layout?.selectedPanels ?? [];
  const analysis = input.analysis;

  // 3. System size. With no analysis there is nothing to size, and we say so
  // rather than producing a zero-watt "system".
  const system = analysis
    ? computeSystemSize(analysis, selectedPanels.length)
    : computeSystemSize(placeholderAnalysis(), 0);

  // 4. Production — two models where available.
  const models: ProductionModelOutput[] = [];
  const failures: Array<{ modelId: ProductionModelId; message: string }> = [];

  if (analysis && !analysis.isManual && selectedPanels.length > 0) {
    models.push(
      providerProductionModel(selectedPanels, {
        dcToAcDerate: derate,
        providerLabel: "Google Solar",
      }),
    );
  } else if (analysis?.isManual) {
    failures.push({
      modelId: "GOOGLE_SOLAR",
      message: "Aerial roof analysis wasn't available for this property, so only the independent model was used.",
    });
  }

  if (input.pvwattsOutput) {
    models.push(input.pvwattsOutput);
  } else if (input.pvwattsFailure) {
    failures.push({ modelId: "PVWATTS_V8", message: input.pvwattsFailure });
  }

  const production = reconcileProduction({
    models,
    failures,
    thresholds: config.production.agreementThresholds,
    assumptions: models.some((m) => m.modelId === "GOOGLE_SOLAR")
      ? [
          `Google Solar reports DC energy; it was converted to AC using an assumed ${(derate * 100).toFixed(0)}% DC-to-AC ratio so the two models could be compared.`,
        ]
      : [],
  });

  // 5. Offset.
  const offsetPercent = computeOffsetPercent(production.annualAcKwh?.value ?? null, annualConsumption);

  // 6. Cost.
  const activeSegments = analysis
    ? [...new Set(selectedPanels.map((p) => p.segmentIndex))]
        .map((index) => analysis.segments.find((s) => s.index === index))
        .filter((s): s is NonNullable<typeof s> => Boolean(s))
        .map((s) => ({ index: s.index, pitchDegrees: s.pitchDegrees }))
    : [];

  const cost = generateCostEstimate({
    config,
    dcSystemSizeKw: system.dcSystemSizeKw.value,
    panelCount: selectedPanels.length,
    activeSegments,
    analysis,
    answers: input.answers,
    incentives: input.incentives,
  });

  // 7. Confidence.
  const confidence = scorePlanningConfidence({
    analysis,
    buildingConfirmed: input.buildingConfirmed,
    propertyChangedSinceImagery: input.propertyChangedSinceImagery,
    imageryStaleYears: config.roof.imageryStaleYears,
    consumption,
    production,
    cost,
    electricalInfoComplete: input.electricalInfoComplete,
    incentiveCount: input.incentives.length,
    incentiveLookupFailed: input.incentiveLookupFailed,
  });

  return {
    system,
    production,
    consumption,
    offsetPercent,
    cost,
    confidence,
    roofUsage: analysis
      ? roofUsage(analysis, selectedPanels.length)
      : { usedPanelCount: 0, maxPanelCount: 0, percentOfSuitableRoofUsed: 0 },
    outstandingVerification: outstandingVerification({
      analysis,
      emptyAnalysis,
      electricalInfoComplete: input.electricalInfoComplete,
      hasIncentives: input.incentives.length > 0,
      productionAvailable: production.annualAcKwh !== null,
    }),
    selectedPanelIds: layout?.selection.selectedPanelIds ?? [],
    layoutNotes: layout?.notes ?? [],
  };
}

/**
 * What the installer must confirm on site (§44). This list is deliberately
 * long and specific — it is what makes a Renovessa solar lead worth more than
 * a name and a phone number.
 */
function outstandingVerification(ctx: {
  analysis: RoofAnalysis | null;
  emptyAnalysis: boolean;
  electricalInfoComplete: boolean;
  hasIncentives: boolean;
  productionAvailable: boolean;
}): string[] {
  const items = [
    "Structural capacity of the roof for the proposed array",
    "Actual roof measurements, obstructions and usable area",
    "Roof covering condition and remaining service life",
    "Fire-code setbacks, access pathways and any local amendments",
    "Main service panel rating, busbar capacity and interconnection method",
    "Utility interconnection requirements and permission-to-operate process",
    "Local permitting requirements and fees",
    "Final equipment selection and availability",
    "Final production modelling with an on-site shade study",
    "Final pricing",
  ];

  if (ctx.emptyAnalysis || ctx.analysis?.isManual) {
    items.unshift("All roof geometry — this plan used a manually described roof, not measured data");
  }
  if (!ctx.electricalInfoComplete) {
    items.push("Whether any electrical service work is required (not yet assessed)");
  }
  if (ctx.hasIncentives) {
    items.push("Homeowner eligibility for each incentive program listed");
  }
  if (!ctx.productionAvailable) {
    items.push("Expected annual production — no production model succeeded for this property");
  }
  return items;
}

/** Zero-state analysis so `computeSystemSize` can produce a well-formed zero. */
function placeholderAnalysis(): RoofAnalysis {
  return {
    providerId: "none",
    isManual: true,
    buildingCenter: { latitude: 0, longitude: 0 },
    imageryQuality: "UNKNOWN",
    segments: [],
    candidatePanels: [],
    panelSpec: { capacityWatts: 0, heightMeters: 0, widthMeters: 0, source: "provider_layout_model" },
    maxPanelCount: 0,
    retrievedAt: new Date(0).toISOString(),
  };
}
