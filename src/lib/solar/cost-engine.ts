/**
 * Deterministic installed-cost engine (§23, §24, E8).
 *
 * AI never determines solar pricing. This pure function is the only price
 * source in the product. It computes from:
 *   - a versioned pricing configuration,
 *   - the system size the layout engine produced, and
 *   - adder triggers that are API-derived, homeowner-answered, or explicitly
 *     labelled assumptions.
 *
 * An adder is never applied because something "looks like" it applies.
 */

import type { CostEstimate, CostLineItem, AppliedIncentive, IncentiveProgram, RoofAnalysis } from "./types";
import {
  bandForSystemSize,
  isPricingApprovedForDisplay,
  type SolarPricingConfig,
  type CostAdder,
} from "./pricing-config";
import { COST_ENGINE_VERSION } from "./versions";
import { fromCalculation } from "./provenance";

/** Homeowner answers that can switch an adder on. All optional; unknown ≠ yes. */
export interface CostAnswerFlags {
  mainPanelUpgradeExpected?: boolean;
  serviceUpgradeExpected?: boolean;
  arrayOnDetachedStructure?: boolean;
  reroofPlanned?: boolean;
}

export interface CostEngineInput {
  config: SolarPricingConfig;
  dcSystemSizeKw: number;
  panelCount: number;
  /** Segments carrying selected panels — used for the objective roof adders. */
  activeSegments: Array<{ index: number; pitchDegrees: number }>;
  analysis: RoofAnalysis | null;
  answers: CostAnswerFlags;
  /** Programs already filtered to verified, in-date, jurisdiction-matched rows. */
  incentives: IncentiveProgram[];
}

const EXCLUSIONS = [
  "Roof repair or replacement",
  "Tree removal or trimming",
  "Structural reinforcement identified on site",
  "Battery storage (quoted separately)",
  "EV charger installation",
  "Utility-imposed upgrades outside the property",
  "Costs arising from conditions not visible in aerial data",
];

function roundTo(value: number, step: number): number {
  if (step <= 0) return Math.round(value);
  return Math.round(value / step) * step;
}

export function generateCostEstimate(input: CostEngineInput): CostEstimate {
  const { config, dcSystemSizeKw, analysis } = input;
  const watts = dcSystemSizeKw * 1000;
  const band = bandForSystemSize(config, dcSystemSizeKw);

  const lineItems: CostLineItem[] = [];
  const assumptions: string[] = [];
  const costDrivers: string[] = [];
  let sortOrder = 0;

  // --- Base system -------------------------------------------------------
  const baseLow = watts * band.dollarsPerWattLow;
  const baseHigh = watts * band.dollarsPerWattHigh;

  lineItems.push({
    category: "base_system",
    description: `Solar system installation — ${dcSystemSizeKw.toFixed(1)} kW DC (${input.panelCount} panels)`,
    lowAmount: baseLow,
    highAmount: baseHigh,
    calculationReference: `${Math.round(watts).toLocaleString()} W × $${band.dollarsPerWattLow.toFixed(2)}–$${band.dollarsPerWattHigh.toFixed(2)}/W`,
    triggerBasis: "always",
    sortOrder: sortOrder++,
  });

  costDrivers.push(`System size (${dcSystemSizeKw.toFixed(1)} kW DC) is the largest single cost driver.`);

  if (config.dataBasis === "unvalidated_planning_default") {
    assumptions.push(
      "The per-watt pricing used here is an internal planning default, not data from local installer proposals. Treat it as a rough bracket only.",
    );
  } else {
    assumptions.push(
      `Per-watt pricing is drawn from Renovessa's ${config.market} pricing model (${config.sampleCount} comparable project${config.sampleCount === 1 ? "" : "s"}, effective ${config.effectiveFrom}).`,
    );
  }

  // --- Adders ------------------------------------------------------------
  const adderByKey = new Map(config.adders.map((a) => [a.key, a]));
  const applyAdder = (key: string, extraReason?: string) => {
    const adder = adderByKey.get(key);
    if (!adder) return;
    lineItems.push({
      category: adder.category,
      description: adder.label,
      lowAmount: adder.lowAmount,
      highAmount: adder.highAmount,
      calculationReference: `$${adder.lowAmount.toLocaleString()}–$${adder.highAmount.toLocaleString()} allowance`,
      triggerBasis: adder.trigger,
      sortOrder: sortOrder++,
    });
    costDrivers.push(extraReason ?? adder.reason);
    if (adder.trigger === "assumption") assumptions.push(adder.reason);
  };

  // API-derived triggers: read from real roof geometry only.
  const steep = input.activeSegments.filter((s) => s.pitchDegrees >= config.roof.steepPitchDegrees);
  if (steep.length > 0 && analysis && !analysis.isManual) {
    applyAdder(
      "steep_roof",
      `${steep.length} of your roof face${steep.length === 1 ? "" : "s"} carrying panels ${steep.length === 1 ? "is" : "are"} ${config.roof.steepPitchDegrees}° or steeper.`,
    );
  }

  const distinctSegments = new Set(input.activeSegments.map((s) => s.index)).size;
  if (distinctSegments >= config.roof.complexRoofSegmentCount) {
    applyAdder("complex_roof", `Panels are spread across ${distinctSegments} separate roof planes.`);
  }

  // Homeowner-answered triggers: only when explicitly true.
  if (input.answers.mainPanelUpgradeExpected === true) applyAdder("main_panel_upgrade");
  if (input.answers.serviceUpgradeExpected === true) applyAdder("service_upgrade");
  if (input.answers.arrayOnDetachedStructure === true) applyAdder("detached_structure");
  if (input.answers.reroofPlanned === true) applyAdder("reroof_coordination");

  // Assumption-based allowance that applies to every project.
  applyAdder("permitting_interconnection");

  // --- Totals ------------------------------------------------------------
  const rawLow = lineItems.reduce((s, li) => s + li.lowAmount, 0);
  const rawHigh = lineItems.reduce((s, li) => s + li.highAmount, 0);
  const installedCostLow = roundTo(rawLow, config.roundToNearest);
  const installedCostHigh = roundTo(rawHigh, config.roundToNearest);

  // --- Incentives --------------------------------------------------------
  const appliedIncentives = applyIncentives(input.incentives, installedCostLow, installedCostHigh, watts);
  const monetised = appliedIncentives.filter((a) => a.includedInNetCost && a.estimatedAmount);

  const netCostLow = monetised.length
    ? Math.max(0, roundTo(installedCostLow - sumIncentives(monetised, installedCostLow, watts), config.roundToNearest))
    : null;
  const netCostHigh = monetised.length
    ? Math.max(0, roundTo(installedCostHigh - sumIncentives(monetised, installedCostHigh, watts), config.roundToNearest))
    : null;

  if (!monetised.length) {
    assumptions.push(
      "No incentive has been verified for this project, so no net cost is shown. The figures above are gross installed cost.",
    );
  }

  // --- Public display gate ----------------------------------------------
  const displayable = isPricingApprovedForDisplay(config);

  return {
    lineItems,
    installedCostLow,
    installedCostHigh,
    dollarsPerWattLow: watts > 0 ? installedCostLow / watts : 0,
    dollarsPerWattHigh: watts > 0 ? installedCostHigh / watts : 0,
    netCostLow,
    netCostHigh,
    appliedIncentives,
    assumptions,
    exclusions: EXCLUSIONS,
    costDrivers,
    pricingConfigVersion: config.version,
    calculationVersion: COST_ENGINE_VERSION,
    displayable,
    withheldReason: displayable
      ? undefined
      : "Cost figures are withheld until a reviewed local pricing model is published for this market.",
  };
}

/**
 * Monetise only programs whose applicability has been established well enough
 * to subtract from a cost (§24). Anything REQUIRES_VERIFICATION is listed for
 * the homeowner but never reduces the number.
 */
function applyIncentives(
  programs: IncentiveProgram[],
  costLow: number,
  costHigh: number,
  watts: number,
): AppliedIncentive[] {
  const midCost = (costLow + costHigh) / 2;

  return programs.map((program) => {
    if (program.applicability === "REQUIRES_VERIFICATION") {
      return {
        program,
        estimatedAmount: null,
        includedInNetCost: false,
        reasonExcluded: "Eligibility has not been established for this project yet.",
      };
    }
    if (program.valueType === "OTHER" || program.value === undefined) {
      return {
        program,
        estimatedAmount: null,
        includedInNetCost: false,
        reasonExcluded: "This program's value can't be calculated from the information available.",
      };
    }

    const raw = amountFor(program, midCost, watts);
    const capped = program.maximumAmount !== undefined ? Math.min(raw, program.maximumAmount) : raw;

    return {
      program,
      estimatedAmount: fromCalculation(capped, {
        unit: "USD",
        calculationVersion: COST_ENGINE_VERSION,
        explanation: explainIncentive(program, capped),
        derivedFrom: [program.sourceName],
        confidence: program.applicability === "LIKELY_APPLICABLE" ? "MEDIUM" : "LOW",
      }),
      includedInNetCost: true,
    };
  });
}

function amountFor(program: IncentiveProgram, cost: number, watts: number): number {
  switch (program.valueType) {
    case "PERCENT_OF_COST":
      return cost * ((program.value ?? 0) / 100);
    case "DOLLARS_PER_WATT":
      return watts * (program.value ?? 0);
    case "FLAT_AMOUNT":
      return program.value ?? 0;
    default:
      return 0;
  }
}

function sumIncentives(applied: AppliedIncentive[], cost: number, watts: number): number {
  return applied.reduce((sum, a) => {
    const capped = a.program.maximumAmount;
    const raw = amountFor(a.program, cost, watts);
    return sum + (capped !== undefined ? Math.min(raw, capped) : raw);
  }, 0);
}

function explainIncentive(program: IncentiveProgram, amount: number): string {
  const basis =
    program.valueType === "PERCENT_OF_COST"
      ? `${program.value}% of the estimated installed cost`
      : program.valueType === "DOLLARS_PER_WATT"
        ? `$${program.value}/W of system capacity`
        : `a flat $${(program.value ?? 0).toLocaleString()}`;
  return `${program.name} is calculated as ${basis}, giving about $${Math.round(amount).toLocaleString()}. Verify eligibility with the program administrator before relying on it — this is planning information, not tax advice.`;
}
