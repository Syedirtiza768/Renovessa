import { describe, it, expect } from "vitest";
import {
  buildExistingTemplate,
  buildProposedFromExisting,
  hasBasicsFilled,
  hasScopeFilled,
  hasSizeFilled,
  needsProposedLayout,
  resolveRoomFeet,
  ROOM_SIZE_BANDS,
} from "@/lib/bathroom/layout-templates";
import { calculateGeometry } from "@/lib/bathroom/geometry";
import { generateEstimate, type EstimateInputs } from "@/lib/bathroom/estimator";
import { DEFAULT_ESTIMATOR_CONFIG } from "@/lib/bathroom/config";
import { scoreConfidence } from "@/lib/bathroom/confidence";

describe("layout-templates", () => {
  it("resolves room feet from size band", () => {
    expect(resolveRoomFeet({ roomSizeBand: "small" })).toEqual({
      lengthFt: 8,
      widthFt: 5,
      ceilingFt: 8,
    });
  });

  it("resolves room feet from canonical explicit measurements", () => {
    expect(resolveRoomFeet({ lengthFt: "10", widthFt: "6", ceilingFt: "9", roomSizeBand: "small" })).toEqual({
      lengthFt: 10,
      widthFt: 6,
      ceilingFt: 9,
    });
  });

  it("builds a powder template without a tub", () => {
    const g = buildExistingTemplate({ bathroomType: "powder", roomSizeBand: "powder" });
    expect(g.fixtures.some((f) => f.type === "toilet")).toBe(true);
    expect(g.fixtures.some((f) => f.type === "tub")).toBe(false);
    expect(g.walls).toHaveLength(4);
  });

  it("builds guest template with tub + vanity + toilet and no floor exhaust fan", () => {
    const g = buildExistingTemplate({ bathroomType: "guest", roomSizeBand: "small" });
    expect(g.fixtures.some((f) => f.type === "tub")).toBe(true);
    expect(g.fixtures.some((f) => f.type === "vanity")).toBe(true);
    expect(g.fixtures.some((f) => f.type === "toilet")).toBe(true);
    expect(g.fixtures.some((f) => f.type === "exhaust_fan")).toBe(false);
  });

  it("converts tub to shower for tub_to_shower objective", () => {
    const existing = buildExistingTemplate({ bathroomType: "guest", roomSizeBand: "medium" });
    const proposed = buildProposedFromExisting(existing, { projectObjective: "tub_to_shower" });
    expect(proposed.fixtures.some((f) => f.type === "tub")).toBe(false);
    expect(
      proposed.fixtures.some((f) => f.type === "shower" || f.type === "shower_enclosure"),
    ).toBe(true);
  });

  it("flags redesign objectives as needing proposed layout", () => {
    expect(needsProposedLayout({ projectObjective: "cosmetic_refresh" })).toBe(false);
    expect(needsProposedLayout({ projectObjective: "tub_to_shower" })).toBe(true);
  });

  it("detects filled basics with canonical zipCode", () => {
    expect(hasBasicsFilled({ bathroomType: "primary", zipCode: "20850" })).toBe(true);
    expect(hasBasicsFilled({ bathroomType: "primary", zip: "20850" })).toBe(true);
    expect(hasBasicsFilled({ bathroomType: "primary" })).toBe(false);
  });

  it("detects filled size with canonical lengthFt/widthFt", () => {
    expect(hasSizeFilled({ lengthFt: "8", widthFt: "5" })).toBe(true);
    expect(hasSizeFilled({ length: "8", width: "5" })).toBe(true);
    expect(hasSizeFilled({ roomSizeBand: "medium" })).toBe(true);
    expect(hasSizeFilled({})).toBe(false);
  });

  it("detects filled scope", () => {
    expect(hasScopeFilled({ projectObjective: "remodel_same_layout" })).toBe(true);
    expect(hasScopeFilled({})).toBe(false);
  });
});

describe("room-size bands affect floor area", () => {
  it.each([
    ["powder", 20],
    ["small", 40],
    ["medium", 54],
    ["large", 96],
  ] as const)("%s band produces ~%s sq ft", (band, expectedArea) => {
    const template = buildExistingTemplate({ bathroomType: "guest", roomSizeBand: band });
    const geo = calculateGeometry(template);
    expect(geo.floorAreaSqft).toBeCloseTo(expectedArea, 0);
  });
});

describe("room-size bands affect estimate", () => {
  const mediumConfidence = scoreConfidence({
    hasExactMeasurements: false,
    hasCompleteDiagram: false,
    hasMultiplePhotos: false,
    finishTierSelected: true,
    plumbingChangesKnown: true,
    conditionQuestionnaireComplete: false,
    unknownLayout: false,
    possibleHiddenDamage: false,
    majorStructuralOrPlumbingUncertainty: false,
  });

  it.each([
    ["powder", 20],
    ["small", 40],
    ["medium", 54],
    ["large", 96],
  ] as const)("%s band produces different estimate than other bands", (band, area) => {
    const inputs: EstimateInputs = {
      objective: "remodel_same_layout",
      bathroomType: "guest",
      finishTier: "standard",
      floorAreaSqft: area,
      plumbingRelocationFt: 0,
      electricalModifications: 1,
      tileFullHeightRoom: false,
      curblessShower: false,
      condoHighFloor: false,
      homeAgeYears: 30,
      waterDamageReported: false,
      locationId: "rockville-md",
    };
    const result = generateEstimate(inputs, DEFAULT_ESTIMATOR_CONFIG, mediumConfidence);
    expect(result.lowAmount).toBeGreaterThan(0);
    expect(result.highComplexityAmount).toBeGreaterThan(result.lowAmount);
  });
});
