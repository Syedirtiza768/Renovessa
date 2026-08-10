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
  locationId: "rockville-md",
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

  it("adds unknown-location disclaimer for non-rockville locations", () => {
    const unknownInputs = { ...baseInputs, locationId: "unknown" };
    const result = generateEstimate(unknownInputs, DEFAULT_ESTIMATOR_CONFIG, mediumConfidence);
    expect(result.assumptions.some((a) => a.includes("does not yet have a published local configuration"))).toBe(true);
  });

  it("does not add unknown-location disclaimer for rockville", () => {
    const result = generateEstimate(baseInputs, DEFAULT_ESTIMATOR_CONFIG, mediumConfidence);
    expect(result.assumptions.some((a) => a.includes("does not yet have a published local configuration"))).toBe(false);
  });

  describe("fixture_replacement (small-job branch)", () => {
    const basinSwap: EstimateInputs = {
      ...baseInputs,
      objective: "fixture_replacement",
      bathroomType: "powder",
      floorAreaSqft: 30,
      fixtureType: "sink_basin",
    };

    it("prices a powder-room basin swap far below a remodel", () => {
      const result = generateEstimate(basinSwap, DEFAULT_ESTIMATOR_CONFIG, mediumConfidence);
      expect(result.lowAmount).toBeLessThan(5000);
      expect(result.highComplexityAmount).toBeLessThan(8000);
      expect(result.lowAmount).toBeGreaterThan(0);
    });

    it("omits remodel-only line items (shower, tile, flooring, permits)", () => {
      const result = generateEstimate(basinSwap, DEFAULT_ESTIMATOR_CONFIG, mediumConfidence);
      const categories = result.lineItems.map((li) => li.category);
      for (const remodelOnly of ["shower_or_tub", "glass_enclosure", "waterproofing", "tile_materials", "tile_labor", "flooring", "permits_and_inspections", "toilet", "painting"]) {
        expect(categories).not.toContain(remodelOnly);
      }
      expect(categories).toContain("fixture_allowance");
      expect(categories).toContain("plumbing_labor");
    });

    it("respects the small-job minimum charge", () => {
      const faucetSwap: EstimateInputs = { ...basinSwap, fixtureType: "faucet", finishTier: "entry" };
      const result = generateEstimate(faucetSwap, DEFAULT_ESTIMATOR_CONFIG, mediumConfidence);
      const min = DEFAULT_ESTIMATOR_CONFIG.fixtureReplacement.smallJobMinimumCharge;
      const overhead = Math.round(min * DEFAULT_ESTIMATOR_CONFIG.overheadPercent);
      const contingency = Math.round(min * DEFAULT_ESTIMATOR_CONFIG.contingencyPercent);
      expect(result.lowAmount).toBeGreaterThanOrEqual(min + overhead + contingency);
    });

    it("scales the fixture allowance by finish tier", () => {
      const standard = generateEstimate(basinSwap, DEFAULT_ESTIMATOR_CONFIG, mediumConfidence);
      const premium = generateEstimate({ ...basinSwap, finishTier: "premium" }, DEFAULT_ESTIMATOR_CONFIG, mediumConfidence);
      expect(premium.lowAmount).toBeGreaterThan(standard.lowAmount);
    });

    it("adds plumbing relocation cost when stated", () => {
      const withReloc = generateEstimate({ ...basinSwap, plumbingRelocationFt: 5 }, DEFAULT_ESTIMATOR_CONFIG, mediumConfidence);
      const without = generateEstimate(basinSwap, DEFAULT_ESTIMATOR_CONFIG, mediumConfidence);
      expect(withReloc.lowAmount).toBeGreaterThan(without.lowAmount);
      expect(withReloc.costDrivers.some((d) => d.includes("Moving plumbing"))).toBe(true);
    });

    it("uses the vanity cabinet allowance for vanity swaps", () => {
      const result = generateEstimate({ ...basinSwap, fixtureType: "vanity_cabinet" }, DEFAULT_ESTIMATOR_CONFIG, mediumConfidence);
      const fixtureItem = result.lineItems.find((li) => li.category === "fixture_allowance");
      expect(fixtureItem?.description).toContain("Vanity cabinet");
    });
  });
});
