import { describe, it, expect } from "vitest";
import { generateEstimate, type EstimateInputs } from "@/lib/bathroom/estimator";
import { DEFAULT_ESTIMATOR_CONFIG } from "@/lib/bathroom/config";
import { scoreConfidence } from "@/lib/bathroom/confidence";

const baseInputs: EstimateInputs = {
  objective: "remodel_same_layout",
  bathroomType: "guest",
  finishTier: "standard",
  floorAreaSqft: 40,
  plumbingRelocationFt: 0,
  electricalModifications: 1,
  tileFullHeightRoom: false,
  curblessShower: false,
  condoHighFloor: false,
  homeAgeYears: 30,
  waterDamageReported: false,
  inRockville: true,
};

const mediumConfidence = scoreConfidence({
  hasExactMeasurements: true,
  hasCompleteDiagram: false,
  hasMultiplePhotos: false,
  finishTierSelected: true,
  plumbingChangesKnown: true,
  conditionQuestionnaireComplete: true,
  unknownLayout: false,
  possibleHiddenDamage: false,
  majorStructuralOrPlumbingUncertainty: false,
});

describe("estimator", () => {
  it("produces a positive low-high range", () => {
    const result = generateEstimate(baseInputs, DEFAULT_ESTIMATOR_CONFIG, mediumConfidence);
    expect(result.lowAmount).toBeGreaterThan(0);
    expect(result.highComplexityAmount).toBeGreaterThan(result.lowAmount);
    expect(result.expectedLowAmount).toBeGreaterThanOrEqual(result.lowAmount);
    expect(result.expectedHighAmount).toBeLessThanOrEqual(result.highComplexityAmount);
  });

  it("respects the minimum charge", () => {
    const tinyInputs = { ...baseInputs, floorAreaSqft: 5 };
    const result = generateEstimate(tinyInputs, DEFAULT_ESTIMATOR_CONFIG, mediumConfidence);
    expect(result.lowAmount).toBeGreaterThanOrEqual(DEFAULT_ESTIMATOR_CONFIG.minimumCharge);
  });

  it("adds a structural allowance for curbless showers", () => {
    const withCurbless = { ...baseInputs, curblessShower: true };
    const result = generateEstimate(withCurbless, DEFAULT_ESTIMATOR_CONFIG, mediumConfidence);
    const structuralItem = result.lineItems.find((li) => li.category === "structural_allowance");
    expect(structuralItem).toBeDefined();
    expect(structuralItem!.lowAmount).toBe(DEFAULT_ESTIMATOR_CONFIG.complexityMultipliers.curblessShowerStructuralAllowance);
  });

  it("increases cost for premium finish tier", () => {
    const standard = generateEstimate(baseInputs, DEFAULT_ESTIMATOR_CONFIG, mediumConfidence);
    const premium = generateEstimate(
      { ...baseInputs, finishTier: "premium" },
      DEFAULT_ESTIMATOR_CONFIG,
      mediumConfidence,
    );
    expect(premium.lowAmount).toBeGreaterThan(standard.lowAmount);
  });

  it("adds water damage contingency", () => {
    const withDamage = { ...baseInputs, waterDamageReported: true };
    const result = generateEstimate(withDamage, DEFAULT_ESTIMATOR_CONFIG, mediumConfidence);
    const noDamage = generateEstimate(baseInputs, DEFAULT_ESTIMATOR_CONFIG, mediumConfidence);
    expect(result.lowAmount).toBeGreaterThan(noDamage.lowAmount);
  });

  it("includes cost drivers for plumbing relocation", () => {
    const withReloc = { ...baseInputs, plumbingRelocationFt: 8 };
    const result = generateEstimate(withReloc, DEFAULT_ESTIMATOR_CONFIG, mediumConfidence);
    expect(result.costDrivers.some((d) => d.includes("Moving plumbing"))).toBe(true);
  });

  it("includes overhead and contingency line items", () => {
    const result = generateEstimate(baseInputs, DEFAULT_ESTIMATOR_CONFIG, mediumConfidence);
    expect(result.lineItems.some((li) => li.category === "general_contractor_overhead")).toBe(true);
    expect(result.lineItems.some((li) => li.category === "contingency")).toBe(true);
  });

  it("records the config version and timestamp", () => {
    const result = generateEstimate(baseInputs, DEFAULT_ESTIMATOR_CONFIG, mediumConfidence);
    expect(result.configVersion).toBe(DEFAULT_ESTIMATOR_CONFIG.version);
    expect(result.calculationTimestamp).toBeTruthy();
  });
});
