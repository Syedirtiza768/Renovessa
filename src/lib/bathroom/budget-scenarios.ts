/**
 * Budget optimizer (PRD §19). Generates Essential / Balanced / Premium
 * scenarios from a base estimate by adjusting finish tier and scope.
 * Pure function — does not mutate the base estimate.
 */

import type { EstimateInputs, EstimateResult } from "./estimator";
import { generateEstimate } from "./estimator";
import { DEFAULT_ESTIMATOR_CONFIG } from "./config";
import type { EstimatorConfig } from "./estimator";
import type { ConfidenceResult } from "./confidence";

export type ScenarioId = "essential" | "balanced" | "premium";

export interface BudgetScenario {
  id: ScenarioId;
  label: string;
  description: string;
  estimate: EstimateResult;
  compromises: string[];
  benefits: string[];
  recommendedNextDecision: string;
}

const TIER_MAP: Record<ScenarioId, string> = {
  essential: "entry",
  balanced: "standard",
  premium: "premium",
};

function adjustInputsForScenario(base: EstimateInputs, scenario: ScenarioId): EstimateInputs {
  if (scenario === "essential") {
    return {
      ...base,
      finishTier: TIER_MAP.essential,
      tileFullHeightRoom: false,
      // Essential keeps existing layout; no plumbing relocation
      plumbingRelocationFt: 0,
      curblessShower: false,
    };
  }
  if (scenario === "balanced") {
    return {
      ...base,
      finishTier: TIER_MAP.balanced,
      // Balanced allows minor relocation but not full redesign
      plumbingRelocationFt: Math.min(base.plumbingRelocationFt, 4),
    };
  }
  // premium
  return {
    ...base,
    finishTier: TIER_MAP.premium,
    tileFullHeightRoom: true,
  };
}

export function generateBudgetScenarios(
  baseInputs: EstimateInputs,
  config: EstimatorConfig = DEFAULT_ESTIMATOR_CONFIG,
  confidence: ConfidenceResult = { level: "MEDIUM", reasons: [], improvements: [] },
): BudgetScenario[] {
  const scenarios: BudgetScenario[] = [];

  const essentialInputs = adjustInputsForScenario(baseInputs, "essential");
  const essentialEstimate = generateEstimate(essentialInputs, config, confidence);
  scenarios.push({
    id: "essential",
    label: "Essential",
    description: "Required repairs, functional replacement, safety, waterproofing, and basic finishes. Existing layout retained.",
    estimate: essentialEstimate,
    compromises: [
      "Stock vanity and standard fixtures",
      "Tile limited to wet areas only",
      "Standard shower enclosure",
      "No layout changes",
    ],
    benefits: [
      "Lowest cost",
      "Fastest schedule",
      "Addresses safety and waterproofing requirements",
    ],
    recommendedNextDecision: "Confirm which existing fixtures to retain and which to replace.",
  });

  const balancedInputs = adjustInputsForScenario(baseInputs, "balanced");
  const balancedEstimate = generateEstimate(balancedInputs, config, confidence);
  scenarios.push({
    id: "balanced",
    label: "Balanced",
    description: "Improved design, mid-range fixtures, select layout improvements, better storage, strong value and durability.",
    estimate: balancedEstimate,
    compromises: [
      "Mid-range (not premium) finishes",
      "Limited plumbing relocation",
      "Stock or semi-custom vanity",
    ],
    benefits: [
      "Better design and durability than Essential",
      "Improved storage and lighting",
      "Strong value for typical homeowners",
    ],
    recommendedNextDecision: "Decide which layout improvements are worth the additional plumbing work.",
  });

  const premiumInputs = adjustInputsForScenario(baseInputs, "premium");
  const premiumEstimate = generateEstimate(premiumInputs, config, confidence);
  scenarios.push({
    id: "premium",
    label: "Premium",
    description: "Custom finishes, premium fixtures, custom cabinetry, extensive tile, layout changes, luxury shower features, enhanced lighting and comfort.",
    estimate: premiumEstimate,
    compromises: [
      "Highest cost",
      "Longer schedule",
      "More decisions required",
    ],
    benefits: [
      "Custom design and finishes",
      "Layout optimized for use and resale",
      "Premium fixtures, cabinetry, and lighting",
    ],
    recommendedNextDecision: "Confirm premium material selections and verify contractor capacity for the scope.",
  });

  return scenarios;
}

/**
 * The optimizer must NOT recommend reducing safety-critical work (PRD §19).
 * This helper flags any scenario that would compromise a protected category.
 */
export function protectedCategories(): string[] {
  return [
    "waterproofing",
    "permits_and_inspections",
    "plumbing_labor",
    "electrical_labor",
    "structural_allowance",
    "ventilation",
  ];
}
