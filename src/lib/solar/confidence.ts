/**
 * Planning confidence engine (§25, §36, E9).
 *
 * Five independent dimensions roll up to one overall level. The point is not
 * the badge — it is the `improvements` list, which turns uncertainty into a
 * concrete next action for the homeowner.
 *
 * Pure function. No I/O.
 */

import type {
  PlanningConfidence,
  ConfidenceDimension,
  ConfidenceLevelName,
  RoofAnalysis,
  ConsumptionResult,
  ReconciledProduction,
  CostEstimate,
} from "./types";
import { consumptionImprovement } from "./consumption";
import { CONFIDENCE_MODEL_VERSION } from "./versions";

const RANK: Record<ConfidenceLevelName, number> = { HIGH: 0, MEDIUM: 1, PRELIMINARY: 2 };

function worst(levels: ConfidenceLevelName[]): ConfidenceLevelName {
  return levels.reduce((acc, l) => (RANK[l] > RANK[acc] ? l : acc), "HIGH" as ConfidenceLevelName);
}

export interface ConfidenceInput {
  analysis: RoofAnalysis | null;
  buildingConfirmed: boolean;
  /** Homeowner said the property has changed since the imagery was captured. */
  propertyChangedSinceImagery?: boolean;
  imageryStaleYears: number;
  consumption: ConsumptionResult;
  production: ReconciledProduction;
  cost: CostEstimate;
  /** True when the electrical questions have been answered either way. */
  electricalInfoComplete: boolean;
  incentiveCount: number;
  incentiveLookupFailed: boolean;
}

function roofDimension(input: ConfidenceInput): ConfidenceDimension {
  const reasons: string[] = [];
  const improvements: string[] = [];
  let level: ConfidenceLevelName = "HIGH";

  const a = input.analysis;

  if (!a) {
    return {
      key: "roof",
      label: "Roof data",
      level: "PRELIMINARY",
      reasons: ["No roof analysis has been run yet."],
      improvements: ["Confirm your address so we can analyse your roof."],
    };
  }

  if (a.isManual) {
    level = "PRELIMINARY";
    reasons.push("Your roof was described manually rather than measured from aerial data.");
    improvements.push("An installer's site visit will replace these roof figures with measured ones.");
  }

  if (!input.buildingConfirmed) {
    level = worst([level, "MEDIUM"]);
    reasons.push("You haven't confirmed that we're looking at the right building.");
    improvements.push("Confirm the building on the map so the analysis is tied to your home.");
  }

  if (a.imageryQuality === "LOW") {
    level = worst([level, "MEDIUM"]);
    reasons.push("The aerial imagery for your property is low resolution.");
  } else if (a.imageryQuality === "UNKNOWN" && !a.isManual) {
    level = worst([level, "MEDIUM"]);
    reasons.push("The imagery quality for your property wasn't reported.");
  }

  const imageryAge = yearsSince(a.imageryDate);
  if (imageryAge !== null && imageryAge > input.imageryStaleYears) {
    level = worst([level, "MEDIUM"]);
    reasons.push(`The aerial imagery is about ${Math.floor(imageryAge)} years old.`);
    improvements.push("Tell us whether your roof, trees or neighbouring buildings have changed since then.");
  }

  if (input.propertyChangedSinceImagery) {
    level = worst([level, "PRELIMINARY"]);
    reasons.push("You told us the property has changed since the imagery was captured.");
    improvements.push("An installer will need to verify the current roof on site.");
  }

  if (!a.isManual && a.segments.length === 0) {
    level = "PRELIMINARY";
    reasons.push("No roof planes could be resolved for this building.");
  }

  if (level === "HIGH" && reasons.length === 0) {
    reasons.push("Roof geometry, orientation and sunlight came from current aerial analysis and you confirmed the building.");
  }

  return { key: "roof", label: "Roof data", level, reasons, improvements };
}

function energyDimension(input: ConfidenceInput): ConfidenceDimension {
  const improvement = consumptionImprovement(input.consumption.basis);
  const improvements = improvement ? [improvement] : [];
  const reasons: string[] = [];
  let level: ConfidenceLevelName;

  switch (input.consumption.basis) {
    case "TWELVE_MONTHS_ACTUAL":
    case "UTILITY_ANNUAL":
      level = "HIGH";
      reasons.push("Your electricity use came from actual readings.");
      break;
    case "PARTIAL_MONTHS_EXTRAPOLATED":
    case "HOMEOWNER_ANNUAL":
      level = "MEDIUM";
      reasons.push("Your electricity use is partly estimated.");
      break;
    case "HOMEOWNER_MONTHLY":
    case "BILL_DOLLARS_APPROXIMATED":
      level = "PRELIMINARY";
      reasons.push("Your electricity use was approximated rather than read from bills.");
      break;
    case "UNKNOWN":
    default:
      level = "PRELIMINARY";
      reasons.push("We don't have your electricity use, so no offset is shown.");
      break;
  }

  if (input.consumption.anomalies.length) {
    level = worst([level, "MEDIUM"]);
    reasons.push("Some of the usage figures you entered conflict with each other.");
    improvements.push("Reconcile the conflicting usage figures so we can use the right one.");
  }

  return { key: "energy", label: "Electricity use", level, reasons, improvements };
}

function productionDimension(input: ConfidenceInput): ConfidenceDimension {
  const reasons: string[] = [];
  const improvements: string[] = [];
  let level: ConfidenceLevelName;

  switch (input.production.agreement) {
    case "HIGH":
      level = "HIGH";
      reasons.push("Two independent production models agree closely.");
      break;
    case "NORMAL":
      level = "HIGH";
      reasons.push("Two independent production models agree within normal modelling variance.");
      break;
    case "MODERATE":
      level = "MEDIUM";
      reasons.push(
        `Two production models differ by ${input.production.differencePercent?.toFixed(1)}%, so the range is wider.`,
      );
      break;
    case "INVESTIGATE":
      level = "PRELIMINARY";
      reasons.push(
        `Two production models differ by ${input.production.differencePercent?.toFixed(1)}%, beyond our review threshold.`,
      );
      improvements.push("An installer's shade study will resolve the difference between the models.");
      break;
    case "SINGLE_MODEL":
      level = "MEDIUM";
      reasons.push("Only one production model was available, so there is no cross-check.");
      break;
    case "NONE":
    default:
      level = "PRELIMINARY";
      reasons.push("No production model succeeded, so no production figure is shown.");
      break;
  }

  return { key: "production", label: "Production model", level, reasons, improvements };
}

function pricingDimension(input: ConfidenceInput): ConfidenceDimension {
  const reasons: string[] = [];
  const improvements: string[] = [];
  let level: ConfidenceLevelName = "HIGH";

  if (!input.cost.displayable) {
    return {
      key: "pricing",
      label: "Cost estimate",
      level: "PRELIMINARY",
      reasons: ["No reviewed local pricing model has been published for your market yet, so costs are withheld."],
      improvements: ["Request installer proposals to get real pricing for your project."],
    };
  }

  if (!input.electricalInfoComplete) {
    level = worst([level, "MEDIUM"]);
    reasons.push("We don't know the condition of your electrical service.");
    improvements.push("Tell us about your main electrical panel — it's a common source of cost surprises.");
  }

  if (input.analysis?.isManual) {
    level = worst([level, "PRELIMINARY"]);
    reasons.push("Costs are based on a manually described roof rather than measured geometry.");
  }

  if (level === "HIGH") {
    reasons.push("System size, roof complexity and electrical information are all known.");
  }

  return { key: "pricing", label: "Cost estimate", level, reasons, improvements };
}

function incentiveDimension(input: ConfidenceInput): ConfidenceDimension {
  if (input.incentiveLookupFailed) {
    return {
      key: "incentive",
      label: "Incentives",
      level: "PRELIMINARY",
      reasons: ["Incentive information could not be verified, so none has been applied."],
      improvements: [],
    };
  }
  if (input.incentiveCount === 0) {
    return {
      key: "incentive",
      label: "Incentives",
      level: "PRELIMINARY",
      reasons: ["No verified incentive program is on file for your jurisdiction, so none has been applied."],
      improvements: [],
    };
  }
  return {
    key: "incentive",
    label: "Incentives",
    level: "MEDIUM",
    reasons: [
      `${input.incentiveCount} program${input.incentiveCount === 1 ? "" : "s"} with a recorded source and verification date may apply.`,
    ],
    improvements: ["Confirm your eligibility with each program administrator before relying on it."],
  };
}

export function scorePlanningConfidence(input: ConfidenceInput): PlanningConfidence {
  const dimensions: ConfidenceDimension[] = [
    roofDimension(input),
    energyDimension(input),
    productionDimension(input),
    pricingDimension(input),
    incentiveDimension(input),
  ];

  // Incentive availability should not drag the whole plan down to PRELIMINARY:
  // a homeowner with a perfect roof analysis and 12 months of bills has a good
  // plan even where no program has been verified. It still shows its own level.
  const overall = worst(dimensions.filter((d) => d.key !== "incentive").map((d) => d.level));

  const seen = new Set<string>();
  const topImprovements: string[] = [];
  // Order by dimension weakness so the most valuable action comes first.
  for (const d of [...dimensions].sort((a, b) => RANK[b.level] - RANK[a.level])) {
    for (const imp of d.improvements) {
      if (seen.has(imp)) continue;
      seen.add(imp);
      topImprovements.push(imp);
    }
  }

  return {
    overall,
    dimensions,
    topImprovements: topImprovements.slice(0, 5),
    calculationVersion: CONFIDENCE_MODEL_VERSION,
  };
}

function yearsSince(isoDate?: string): number | null {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  return (Date.now() - d.getTime()) / (365.25 * 86_400_000);
}

export function confidenceLabel(level: ConfidenceLevelName): string {
  switch (level) {
    case "HIGH":
      return "High";
    case "MEDIUM":
      return "Medium";
    case "PRELIMINARY":
      return "Preliminary";
  }
}
