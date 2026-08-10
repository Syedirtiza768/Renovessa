/**
 * Deterministic bathroom estimate engine (PRD §17).
 * Pure function: project inputs + versioned config -> estimate.
 * AI never sets prices; this is the only price source.
 */

import { DEFAULT_ESTIMATOR_CONFIG } from "./config";
import type { ConfidenceResult } from "./confidence";

export type EstimatorConfig = typeof DEFAULT_ESTIMATOR_CONFIG;

export interface EstimateInputs {
  objective: string;
  bathroomType: string;
  finishTier: string;
  floorAreaSqft: number;
  plumbingRelocationFt: number;
  electricalModifications: number;
  tileFullHeightRoom: boolean;
  curblessShower: boolean;
  condoHighFloor: boolean;
  homeAgeYears: number;
  waterDamageReported: boolean;
  locationId: string;
  /** For objective "fixture_replacement": which fixture is being swapped. */
  fixtureType?: string;
  /** When false, shower/tub assembly, glass enclosure, and waterproofing are
   * omitted (powder rooms, existing tub retained). Defaults to true. */
  includeShowerWork?: boolean;
}

export interface LineItem {
  category: string;
  description: string;
  quantity: number;
  unit: string;
  unitRate: number;
  lowAmount: number;
  highAmount: number;
  multiplier: number;
  calculationReference: string;
  sortOrder: number;
}

export interface EstimateResult {
  lowAmount: number;
  expectedLowAmount: number;
  expectedHighAmount: number;
  highComplexityAmount: number;
  contingencyAmount: number;
  confidenceLevel: "HIGH" | "MEDIUM" | "LOW";
  lineItems: LineItem[];
  assumptions: string[];
  unknowns: string[];
  exclusions: string[];
  costDrivers: string[];
  configVersion: string;
  calculationTimestamp: string;
}

function factorForObjective(config: EstimatorConfig, objective: string) {
  const entry = (config.baseRates.perSqft as any)[objective];
  if (!entry) return { low: 100, high: 200 };
  return entry;
}

function bathroomTypeFactor(config: EstimatorConfig, type: string) {
  return (config.bathroomTypeFactor as any)[type] ?? 1;
}

function finishFactor(config: EstimatorConfig, tier: string) {
  return (config.qualityTierFactor as any)[tier] ?? 1;
}

function locationFactor(config: EstimatorConfig, locationId: string): number {
  // Only rockville-md has a published config today. Unknown locations
  // use the same baseline with a clear disclaimer in the assumptions.
  if (locationId === "rockville-md") return config.locationFactor;
  return config.locationFactor;
}

/**
 * Small-job branch: single-fixture replacement (basin, faucet, toilet, vanity,
 * shower trim). Itemized flat allowances instead of the per-sqft remodel
 * baseline — no shower/tub, tile, flooring, or permit line items.
 */
function generateFixtureReplacementEstimate(
  inputs: EstimateInputs,
  config: EstimatorConfig,
  confidence: ConfidenceResult,
): EstimateResult {
  const fr = config.fixtureReplacement;
  const finishF = finishFactor(config, inputs.finishTier || "standard");
  const fixture = (fr.fixtures as any)[inputs.fixtureType ?? ""] ?? fr.fixtures.sink_basin;

  const lineItems: LineItem[] = [];
  let sortOrder = 0;
  const push = (item: Omit<LineItem, "sortOrder">) => {
    lineItems.push({ ...item, sortOrder: sortOrder++ });
  };

  push({
    category: "demolition",
    description: "Remove and dispose of existing fixture",
    quantity: 1, unit: "project", unitRate: fr.removalDisposal.low,
    lowAmount: fr.removalDisposal.low, highAmount: fr.removalDisposal.high,
    multiplier: 1, calculationReference: "Flat removal allowance",
  });
  push({
    category: "fixture_allowance",
    description: fixture.label,
    quantity: 1, unit: "each", unitRate: Math.round(fixture.low * finishF),
    lowAmount: Math.round(fixture.low * finishF), highAmount: Math.round(fixture.high * finishF),
    multiplier: finishF, calculationReference: "Finish-tier scaled",
  });
  const relocLow = Math.round(inputs.plumbingRelocationFt * config.complexityMultipliers.plumbingRelocationPerFt);
  push({
    category: "plumbing_labor",
    description: "Plumbing labor (disconnect, reconnect, seal)",
    quantity: 1, unit: "project", unitRate: fr.plumbingLabor.low,
    lowAmount: fr.plumbingLabor.low + relocLow,
    highAmount: fr.plumbingLabor.high + Math.round(relocLow * 1.5),
    multiplier: 1, calculationReference: "Flat hookup labor + relocation per foot",
  });
  push({
    category: "parts_and_materials",
    description: "Supply lines, trap, sealant, and minor parts",
    quantity: 1, unit: "project", unitRate: fr.partsAndMaterials.low,
    lowAmount: fr.partsAndMaterials.low, highAmount: fr.partsAndMaterials.high,
    multiplier: 1, calculationReference: "Flat allowance",
  });
  push({
    category: "site_protection",
    description: "Site protection and cleanup",
    quantity: 1, unit: "project", unitRate: fr.siteProtectionCleanup.low,
    lowAmount: fr.siteProtectionCleanup.low, highAmount: fr.siteProtectionCleanup.high,
    multiplier: 1, calculationReference: "Flat allowance",
  });

  let lowSum = lineItems.reduce((s, i) => s + i.lowAmount, 0);
  let highSum = lineItems.reduce((s, i) => s + i.highAmount, 0);
  lowSum = Math.max(lowSum, fr.smallJobMinimumCharge);

  const overheadLow = Math.round(lowSum * config.overheadPercent);
  const overheadHigh = Math.round(highSum * config.overheadPercent);
  const contingencyLow = Math.round(lowSum * config.contingencyPercent);
  const contingencyHigh = Math.round(highSum * config.contingencyPercent);

  push({
    category: "general_contractor_overhead",
    description: "General contractor overhead",
    quantity: 1, unit: "project", unitRate: overheadLow,
    lowAmount: overheadLow, highAmount: overheadHigh, multiplier: config.overheadPercent,
    calculationReference: `${Math.round(config.overheadPercent * 100)}% of subtotal`,
  });
  push({
    category: "contingency",
    description: "Contingency for unknowns",
    quantity: 1, unit: "project", unitRate: contingencyLow,
    lowAmount: contingencyLow, highAmount: contingencyHigh, multiplier: config.contingencyPercent,
    calculationReference: `${Math.round(config.contingencyPercent * 100)}% of subtotal`,
  });

  const totalLow = lowSum + overheadLow + contingencyLow;
  const totalHigh = highSum + overheadHigh + contingencyHigh;
  const expectedLow = Math.round(totalLow + (totalHigh - totalLow) * 0.33);
  const expectedHigh = Math.round(totalLow + (totalHigh - totalLow) * 0.66);

  const costDrivers: string[] = [];
  if (inputs.plumbingRelocationFt > 0) costDrivers.push(`Moving plumbing ~${inputs.plumbingRelocationFt} ft adds labor and material`);
  if (finishF >= 1.4) costDrivers.push("Premium/luxury fixture selections widen the cost range");
  if (inputs.waterDamageReported) costDrivers.push("Reported leaks or water stains may add shutoff valve or supply-line repairs");

  const assumptions: string[] = [
    "Estimate is for a like-for-like single-fixture replacement in the same location.",
    "Like-for-like replacement typically does not require permits; if plumbing or electrical is modified, permits may apply.",
    "Estimate assumes standard DMV labor rates and contractor overhead.",
    "Shutoff valves and supply lines are assumed serviceable; seized or corroded valves add cost.",
  ];
  if (inputs.locationId !== "rockville-md") {
    assumptions.push(
      "This location does not yet have a published local configuration. The range uses the Rockville baseline as a reference point and may differ from actual local costs.",
    );
  }

  return {
    lowAmount: totalLow,
    expectedLowAmount: expectedLow,
    expectedHighAmount: expectedHigh,
    highComplexityAmount: totalHigh,
    contingencyAmount: contingencyHigh,
    confidenceLevel: confidence.level,
    lineItems,
    assumptions,
    unknowns: [
      "Condition of existing shutoff valves, trap, and supply connections",
      "Hidden water damage in the vanity cabinet or wall behind the fixture",
    ],
    exclusions: [
      "This is not a binding quote or contractor proposal",
      "Excludes any work beyond the single fixture swap (tile, flooring, painting, other fixtures)",
      "Excludes plumbing relocation beyond the stated distance and wall or floor repair",
    ],
    costDrivers,
    configVersion: config.version,
    calculationTimestamp: new Date().toISOString(),
  };
}

export function generateEstimate(
  inputs: EstimateInputs,
  config: EstimatorConfig = DEFAULT_ESTIMATOR_CONFIG,
  confidence: ConfidenceResult = { level: "MEDIUM", reasons: [], improvements: [] },
): EstimateResult {
  if (inputs.objective === "fixture_replacement") {
    return generateFixtureReplacementEstimate(inputs, config, confidence);
  }
  const area = Math.max(20, inputs.floorAreaSqft || 40);
  const base = factorForObjective(config, inputs.objective);
  const bTypeF = bathroomTypeFactor(config, inputs.bathroomType);
  const finishF = finishFactor(config, inputs.finishTier || "standard");
  const locF = locationFactor(config, inputs.locationId);

  const baseLow = area * base.low * bTypeF * finishF * locF;
  const baseHigh = area * base.high * bTypeF * finishF * locF;

  const lineItems: LineItem[] = [];
  let sortOrder = 0;
  const push = (item: Omit<LineItem, "sortOrder">) => {
    lineItems.push({ ...item, sortOrder: sortOrder++ });
  };

  const shares = config.categoryShares as Record<string, { low: number; high: number; tier?: boolean; showerOnly?: boolean }>;
  const includeShowerWork = inputs.includeShowerWork !== false;
  const tileMult = inputs.tileFullHeightRoom ? config.complexityMultipliers.tileFullHeightRoomFactor : 1;

  /**
   * Decompose the per-sqft baseline into a PRD §17.2 category line item.
   * Tier-scaled categories are multiplied by the finish-tier factor;
   * tileScaled categories by the full-height-tile multiplier.
   */
  const shareItem = (
    shareKey: string,
    category: string,
    description: string,
    opts: { tileScaled?: boolean; addLow?: number; addHigh?: number; calc?: string } = {},
  ) => {
    const share = shares[shareKey];
    const tF = share.tier ? finishF : 1;
    const tM = opts.tileScaled ? tileMult : 1;
    const low = Math.round(baseLow * share.low * tF * tM) + (opts.addLow ?? 0);
    const high = Math.round(baseHigh * share.high * tF * tM) + (opts.addHigh ?? 0);
    push({
      category, description,
      quantity: 1, unit: "project", unitRate: low,
      lowAmount: low, highAmount: high,
      multiplier: tF * tM,
      calculationReference:
        opts.calc ?? `${Math.round(share.low * 100)}-${Math.round(share.high * 100)}% of per-sqft baseline`,
    });
  };

  // Core construction
  shareItem("designAndPlanning", "design_and_planning", "Design and planning allowance");
  shareItem("demolition", "demolition", "Demolition of existing bathroom");
  shareItem("debrisRemoval", "debris_removal", "Debris removal and disposal");
  shareItem("framing", "framing", "Framing and rough carpentry allowance");
  shareItem("subfloorAllowance", "subfloor_allowance", "Subfloor repair allowance");

  // Permits — flat, scope-independent allowance
  const permitLow = config.permitAllowance.building + config.permitAllowance.plumbing + config.permitAllowance.electrical;
  push({
    category: "permits_and_inspections",
    description: "Permit allowance (building + plumbing + electrical)",
    quantity: 1, unit: "project", unitRate: permitLow,
    lowAmount: permitLow, highAmount: Math.round(permitLow * 1.5), multiplier: 1,
    calculationReference: "Configured permit allowances",
  });

  // Plumbing (baseline share + relocation add-on)
  const relocLow = Math.round(inputs.plumbingRelocationFt * config.complexityMultipliers.plumbingRelocationPerFt);
  shareItem("plumbingLabor", "plumbing_labor", "Plumbing labor (rough + finish)", {
    addLow: relocLow, addHigh: Math.round(relocLow * 1.5),
    calc: "Baseline share + relocation per foot",
  });
  shareItem("plumbingFixtures", "plumbing_fixtures", "Plumbing fixtures (toilet, faucets, shower system)");

  // Electrical (baseline share + per-modification add-on)
  const elecAdd = inputs.electricalModifications * config.complexityMultipliers.electricalModificationEach;
  shareItem("electricalLabor", "electrical_labor", "Electrical labor", {
    addLow: elecAdd, addHigh: elecAdd,
    calc: "Baseline share + per-modification allowance",
  });
  shareItem("lighting", "lighting", "Lighting fixtures");
  shareItem("ventilation", "ventilation", "Exhaust fan and ducting");

  // Shower / wet-area work — omitted entirely when the scope has none
  // (powder rooms, existing tub retained), so those jobs are never charged
  // for shower assemblies, enclosures, or waterproofing.
  if (includeShowerWork) {
    shareItem("waterproofing", "waterproofing", "Shower waterproofing system");
    shareItem("showerOrTub", "shower_or_tub",
      inputs.curblessShower ? "Curbless shower base + linear drain" : "Shower or tub assembly");
    if (inputs.curblessShower) {
      push({
        category: "structural_allowance",
        description: "Curbless shower structural allowance (floor recess / drainage)",
        quantity: 1, unit: "project", unitRate: config.complexityMultipliers.curblessShowerStructuralAllowance,
        lowAmount: config.complexityMultipliers.curblessShowerStructuralAllowance,
        highAmount: Math.round(config.complexityMultipliers.curblessShowerStructuralAllowance * 1.6),
        multiplier: 1, calculationReference: "Curbless structural allowance",
      });
    }
    shareItem("glassEnclosure", "glass_enclosure", "Glass shower enclosure");
  }

  // Tile (full-height rooms scale via the tile multiplier)
  shareItem("tileMaterials", "tile_materials", "Tile materials", { tileScaled: true });
  shareItem("tileLabor", "tile_labor", "Tile installation labor", { tileScaled: true });

  // Flooring, vanity, and remaining fixtures/finishes
  shareItem("flooring", "flooring", "Flooring materials + install");
  shareItem("vanityAndCabinetry", "vanity_and_cabinetry", "Vanity and cabinetry");
  shareItem("countertop", "countertop", "Countertop");
  shareItem("toilet", "toilet", "Toilet");
  shareItem("mirrorsAndAccessories", "mirrors_and_accessories", "Mirrors and accessories");
  shareItem("painting", "painting", "Painting");
  shareItem("trimAndFinishCarpentry", "trim_and_finish_carpentry", "Trim and finish carpentry");
  shareItem("siteProtection", "site_protection", "Site protection and cleanup");
  shareItem("projectManagement", "project_management", "Project management");

  // Complexity adjustments
  let lowSum = lineItems.reduce((s, i) => s + i.lowAmount, 0);
  let highSum = lineItems.reduce((s, i) => s + i.highAmount, 0);

  if (inputs.condoHighFloor) {
    const add = config.complexityMultipliers.condoHighFloorFactor - 1;
    lowSum = Math.round(lowSum * (1 + add));
    highSum = Math.round(highSum * (1 + add));
  }
  if (inputs.homeAgeYears > 60) {
    const add = config.complexityMultipliers.homeAgeOver60YearsFactor - 1;
    lowSum = Math.round(lowSum * (1 + add));
    highSum = Math.round(highSum * (1 + add));
  }
  if (inputs.waterDamageReported) {
    lowSum += config.complexityMultipliers.waterDamageContingencyAdd;
    highSum += Math.round(config.complexityMultipliers.waterDamageContingencyAdd * 1.8);
  }

  // Minimum charge
  lowSum = Math.max(lowSum, config.minimumCharge);

  // Overhead + contingency
  const overheadLow = Math.round(lowSum * config.overheadPercent);
  const overheadHigh = Math.round(highSum * config.overheadPercent);
  const contingencyLow = Math.round(lowSum * config.contingencyPercent);
  const contingencyHigh = Math.round(highSum * config.contingencyPercent);

  push({
    category: "general_contractor_overhead",
    description: "General contractor overhead",
    quantity: 1, unit: "project", unitRate: overheadLow,
    lowAmount: overheadLow, highAmount: overheadHigh, multiplier: config.overheadPercent,
    calculationReference: `${Math.round(config.overheadPercent * 100)}% of subtotal`,
  });
  push({
    category: "contingency",
    description: "Contingency for unknowns",
    quantity: 1, unit: "project", unitRate: contingencyLow,
    lowAmount: contingencyLow, highAmount: contingencyHigh, multiplier: config.contingencyPercent,
    calculationReference: `${Math.round(config.contingencyPercent * 100)}% of subtotal`,
  });

  const totalLow = lowSum + overheadLow + contingencyLow;
  const totalHigh = highSum + overheadHigh + contingencyHigh;
  const expectedLow = Math.round(totalLow + (totalHigh - totalLow) * 0.33);
  const expectedHigh = Math.round(totalLow + (totalHigh - totalLow) * 0.66);
  const highComplexity = totalHigh;
  const contingencyAmount = contingencyHigh;

  const costDrivers: string[] = [];
  if (inputs.plumbingRelocationFt > 0) costDrivers.push(`Moving plumbing ~${inputs.plumbingRelocationFt} ft adds labor and material`);
  if (inputs.curblessShower) costDrivers.push("Curbless shower may require floor and drainage modifications");
  if (inputs.tileFullHeightRoom) costDrivers.push("Floor-to-ceiling tile increases material and installation quantities");
  if (inputs.condoHighFloor) costDrivers.push("Higher-floor condominium access may increase labor and disposal effort");
  if (inputs.homeAgeYears > 60) costDrivers.push("Older homes often hide conditions behind walls");
  if (inputs.waterDamageReported) costDrivers.push("Unknown water damage requires a larger contingency");
  if (finishF >= 1.4) costDrivers.push("Premium/luxury finishes widen the cost range");

  const assumptions: string[] = [
    "Estimate assumes standard DMV labor rates and contractor overhead.",
    "Permit allowance is an estimate; actual permit costs depend on jurisdiction and scope.",
    "Tile area includes shower walls and floor; verify final selection.",
    "Plumbing relocation distance is approximate until verified on site.",
  ];

  if (inputs.locationId !== "rockville-md") {
    assumptions.push(
      "This location does not yet have a published local configuration. The range uses the Rockville baseline as a reference point and may differ from actual local costs.",
    );
  }

  return {
    lowAmount: totalLow,
    expectedLowAmount: expectedLow,
    expectedHighAmount: expectedHigh,
    highComplexityAmount: highComplexity,
    contingencyAmount,
    confidenceLevel: confidence.level,
    lineItems,
    assumptions,
    unknowns: [
      "Hidden water, mold, or structural conditions behind walls or under flooring",
      "Exact permit and inspection requirements for this jurisdiction",
      "Contractor-specific overhead and project management practices",
    ],
    exclusions: [
      "This is not a binding quote or contractor proposal",
      "Excludes asbestos/lead abatement, mold remediation, and structural engineering",
      "Excludes work outside the bathroom footprint (hallway, adjacent rooms)",
      "Excludes luxury material upgrades beyond the selected finish tier",
    ],
    costDrivers,
    configVersion: config.version,
    calculationTimestamp: new Date().toISOString(),
  };
}
