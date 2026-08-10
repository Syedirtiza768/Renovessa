/**
 * Numerical correctness (§62).
 *
 * These tests exist to catch the failure mode that matters most in this
 * product: a confidently-presented wrong number. They pin the arithmetic
 * identities (panels x watts = kW, segment aggregation, monthly/annual
 * reconciliation, offset, incentive maths) and the rounding boundary.
 */

import { describe, it, expect } from "vitest";
import type { RoofAnalysis, CandidatePanel, RoofSegment, IncentiveProgram } from "../types";
import { selectPanels, computeSystemSize, buildSegmentProductionInputs, rankCandidates, roofUsage } from "../layout-engine";
import { reconcileProduction, providerProductionModel, computeOffsetPercent, differencePercent, classifyAgreement, DEFAULT_AGREEMENT_THRESHOLDS } from "../production";
import { deriveConsumption } from "../consumption";
import { generateCostEstimate } from "../cost-engine";
import { DEFAULT_SOLAR_PRICING_CONFIG, bandForSystemSize } from "../pricing-config";
import { medianOfQuantiles } from "../providers/google-solar";
import { normalizeAzimuth } from "../providers/pvwatts";

// --- Fixtures --------------------------------------------------------------

function segment(index: number, azimuth: number, pitch: number, area = 40): RoofSegment {
  return {
    index,
    pitchDegrees: pitch,
    azimuthDegrees: azimuth,
    areaMeters2: area,
    center: { latitude: 39.084 + index * 0.0001, longitude: -77.153 },
    boundingBox: {
      sw: { latitude: 39.0838, longitude: -77.1532 },
      ne: { latitude: 39.0842, longitude: -77.1528 },
    },
    sunshineQuantiles: [800, 1000, 1200, 1400, 1600],
    medianSunshineHours: 1200,
  };
}

function panel(id: string, segmentIndex: number, energy: number): CandidatePanel {
  return {
    id,
    segmentIndex,
    center: { latitude: 39.084, longitude: -77.153 },
    orientation: "LANDSCAPE",
    yearlyEnergyDcKwh: energy,
  };
}

/** Two roof faces: south (higher yield) and west (lower). */
function fixtureAnalysis(): RoofAnalysis {
  return {
    providerId: "google-solar",
    isManual: false,
    buildingCenter: { latitude: 39.084, longitude: -77.153 },
    imageryDate: "2025-06-01",
    imageryQuality: "HIGH",
    segments: [segment(0, 180, 25), segment(1, 270, 25)],
    candidatePanels: [
      panel("0:0", 0, 600),
      panel("0:1", 0, 590),
      panel("0:2", 0, 580),
      panel("1:0", 1, 450),
      panel("1:1", 1, 440),
    ],
    panelSpec: { capacityWatts: 430, heightMeters: 1.879, widthMeters: 1.045, source: "provider_layout_model" },
    maxPanelCount: 5,
    retrievedAt: "2026-08-10T00:00:00.000Z",
  };
}

// --- System sizing ---------------------------------------------------------

describe("system sizing", () => {
  it("panel count x panel watts = DC capacity", () => {
    const analysis = fixtureAnalysis();
    const size = computeSystemSize(analysis, 21);
    expect(size.panelCount.value).toBe(21);
    expect(size.panelCapacityWatts.value).toBe(430);
    expect(size.dcSystemSizeKw.value).toBeCloseTo(9.03, 6);
  });

  it("never assumes 400 W — it uses the provider's panel spec", () => {
    const analysis = fixtureAnalysis();
    analysis.panelSpec.capacityWatts = 505;
    expect(computeSystemSize(analysis, 10).dcSystemSizeKw.value).toBeCloseTo(5.05, 6);
  });

  it("attributes capacity to the equipment catalog when a module was chosen", () => {
    const analysis = fixtureAnalysis();
    analysis.panelSpec = {
      capacityWatts: 440,
      heightMeters: 1.9,
      widthMeters: 1.1,
      source: "equipment_catalog",
      manufacturer: "Acme",
      model: "A440",
    };
    const size = computeSystemSize(analysis, 4);
    expect(size.panelCapacityWatts.provenance.sourceName).toContain("Acme");
    expect(size.panelCapacityWatts.provenance.confidence).toBe("HIGH");
  });
});

// --- Layout selection ------------------------------------------------------

describe("panel selection", () => {
  it("ranks by production and is stable across runs", () => {
    const analysis = fixtureAnalysis();
    const a = rankCandidates(analysis.candidatePanels).map((p) => p.id);
    const b = rankCandidates([...analysis.candidatePanels].reverse()).map((p) => p.id);
    expect(a).toEqual(b);
    expect(a[0]).toBe("0:0");
  });

  it("MAXIMIZE_PRODUCTION takes the N best positions", () => {
    const result = selectPanels({
      analysis: fixtureAnalysis(),
      strategy: "MAXIMIZE_PRODUCTION",
      panelCount: 3,
      dcToAcDerate: 0.85,
    });
    expect(result.selection.selectedPanelIds).toEqual(["0:0", "0:1", "0:2"]);
  });

  it("caps at the available positions and says so", () => {
    const result = selectPanels({
      analysis: fixtureAnalysis(),
      strategy: "MAXIMIZE_PRODUCTION",
      panelCount: 99,
      dcToAcDerate: 0.85,
    });
    expect(result.selectedPanels).toHaveLength(5);
    expect(result.notes.join(" ")).toContain("Only 5 suitable panel positions");
  });

  it("excludes whole roof faces before selecting", () => {
    const result = selectPanels({
      analysis: fixtureAnalysis(),
      strategy: "MAXIMIZE_COUNT",
      excludedSegmentIndices: [1],
      dcToAcDerate: 0.85,
    });
    expect(result.selectedPanels.every((p) => p.segmentIndex === 0)).toBe(true);
    expect(result.selectedPanels).toHaveLength(3);
  });

  it("TARGET_OFFSET stops as soon as the goal is met", () => {
    // Panels yield 600/590/580 DC; at 0.85 derate that is 510/501.5/493 AC.
    // A 1000 kWh goal should need exactly two panels.
    const result = selectPanels({
      analysis: fixtureAnalysis(),
      strategy: "TARGET_OFFSET",
      targetOffsetFraction: 1,
      annualConsumptionKwh: 1000,
      dcToAcDerate: 0.85,
    });
    expect(result.selectedPanels).toHaveLength(2);
  });

  it("TARGET_OFFSET falls back to the whole roof — and says so — with no usage", () => {
    const result = selectPanels({
      analysis: fixtureAnalysis(),
      strategy: "TARGET_OFFSET",
      targetOffsetFraction: 1,
      dcToAcDerate: 0.85,
    });
    expect(result.selectedPanels).toHaveLength(5);
    expect(result.notes.join(" ")).toContain("electricity usage");
  });

  it("reports when the roof cannot reach the requested offset", () => {
    const result = selectPanels({
      analysis: fixtureAnalysis(),
      strategy: "TARGET_OFFSET",
      targetOffsetFraction: 1,
      annualConsumptionKwh: 999_999,
      dcToAcDerate: 0.85,
    });
    expect(result.notes.join(" ")).toContain("can't reach");
  });

  it("drops manual selections that no longer exist and flags it", () => {
    const result = selectPanels({
      analysis: fixtureAnalysis(),
      strategy: "MANUAL",
      explicitPanelIds: ["0:0", "9:9"],
      dcToAcDerate: 0.85,
    });
    expect(result.selection.selectedPanelIds).toEqual(["0:0"]);
    expect(result.notes.join(" ")).toContain("no longer available");
  });
});

// --- Segment aggregation ---------------------------------------------------

describe("segment aggregation for production modelling", () => {
  it("groups panels by roof face with each face's own tilt and azimuth", () => {
    const analysis = fixtureAnalysis();
    const selected = analysis.candidatePanels; // all five
    const inputs = buildSegmentProductionInputs(analysis, selected, 5);

    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toMatchObject({ segmentIndex: 0, panelCount: 3, azimuthDegrees: 180 });
    expect(inputs[1]).toMatchObject({ segmentIndex: 1, panelCount: 2, azimuthDegrees: 270 });

    // Capacity per segment must sum to the whole-system capacity.
    const total = inputs.reduce((s, i) => s + i.capacityKw, 0);
    expect(total).toBeCloseTo((5 * 430) / 1000, 6);
  });

  it("flags near-flat faces as tilt-adjusted rather than silently changing them", () => {
    const analysis = fixtureAnalysis();
    analysis.segments[0] = segment(0, 180, 2);
    const inputs = buildSegmentProductionInputs(analysis, [panel("0:0", 0, 600)], 5);
    expect(inputs[0].tiltWasAdjusted).toBe(true);
    expect(inputs[0].tiltDegrees).toBe(2); // the real value is preserved
  });
});

// --- Production reconciliation ---------------------------------------------

describe("production reconciliation", () => {
  const thresholds = DEFAULT_AGREEMENT_THRESHOLDS;

  it("computes difference against the mean, symmetrically", () => {
    expect(differencePercent(100, 110)).toBeCloseTo(9.5238, 3);
    expect(differencePercent(110, 100)).toBeCloseTo(9.5238, 3);
  });

  it("classifies agreement by the configured thresholds", () => {
    expect(classifyAgreement(3, thresholds)).toBe("HIGH");
    expect(classifyAgreement(7, thresholds)).toBe("NORMAL");
    expect(classifyAgreement(12, thresholds)).toBe("MODERATE");
    expect(classifyAgreement(30, thresholds)).toBe("INVESTIGATE");
  });

  it("never simply picks the larger model", () => {
    const result = reconcileProduction({
      models: [
        { modelId: "GOOGLE_SOLAR", annualAcKwh: 12_000, monthlyAcKwh: [], notes: [] },
        { modelId: "PVWATTS_V8", annualAcKwh: 10_000, monthlyAcKwh: [], notes: [] },
      ],
      failures: [],
    });
    expect(result.annualAcKwh?.value).toBe(11_000);
    expect(result.annualAcKwh!.value).toBeLessThan(12_000);
  });

  it("widens the range beyond both models when they materially disagree", () => {
    const result = reconcileProduction({
      models: [
        { modelId: "GOOGLE_SOLAR", annualAcKwh: 14_000, monthlyAcKwh: [], notes: [] },
        { modelId: "PVWATTS_V8", annualAcKwh: 10_000, monthlyAcKwh: [], notes: [] },
      ],
      failures: [],
    });
    expect(result.agreement).toBe("INVESTIGATE");
    expect(result.rangeLowKwh!.value).toBeLessThan(10_000);
    expect(result.rangeHighKwh!.value).toBeGreaterThan(14_000);
    expect(result.annualAcKwh!.provenance.confidence).toBe("LOW");
  });

  it("uses a wider band and marks SINGLE_MODEL when only one model ran", () => {
    const result = reconcileProduction({
      models: [{ modelId: "PVWATTS_V8", annualAcKwh: 10_000, monthlyAcKwh: [], notes: [] }],
      failures: [{ modelId: "GOOGLE_SOLAR", message: "no coverage" }],
    });
    expect(result.agreement).toBe("SINGLE_MODEL");
    expect(result.rangeLowKwh!.value).toBeCloseTo(8_500, 6);
    expect(result.rangeHighKwh!.value).toBeCloseTo(11_500, 6);
  });

  it("withholds production entirely when no model succeeded", () => {
    const result = reconcileProduction({
      models: [],
      failures: [
        { modelId: "GOOGLE_SOLAR", message: "x" },
        { modelId: "PVWATTS_V8", message: "y" },
      ],
    });
    expect(result.annualAcKwh).toBeNull();
    expect(result.monthlyAcKwh).toBeNull();
    expect(result.agreement).toBe("NONE");
  });

  it("reconciles monthly to annual from the model that supplied months", () => {
    const monthly = [800, 900, 1000, 1100, 1200, 1250, 1250, 1200, 1050, 900, 750, 700];
    const annual = monthly.reduce((a, b) => a + b, 0);
    const result = reconcileProduction({
      models: [{ modelId: "PVWATTS_V8", annualAcKwh: annual, monthlyAcKwh: monthly, notes: [] }],
      failures: [],
    });
    const monthlySum = result.monthlyAcKwh!.value.reduce((a, b) => a + b, 0);
    expect(monthlySum).toBeCloseTo(result.annualAcKwh!.value, 6);
  });

  it("converts the provider's DC figure to AC before comparison", () => {
    const model = providerProductionModel([panel("0:0", 0, 1000)], {
      dcToAcDerate: 0.85,
      providerLabel: "Google Solar",
    });
    expect(model.annualAcKwh).toBeCloseTo(850, 6);
  });
});

// --- Offset ----------------------------------------------------------------

describe("solar offset", () => {
  it("is production over consumption", () => {
    expect(computeOffsetPercent(10_650, 13_000)!.value).toBeCloseTo(81.923, 3);
  });

  it("caps display at 100% but explains the surplus", () => {
    const tracked = computeOffsetPercent(20_000, 10_000)!;
    expect(tracked.value).toBe(100);
    expect(tracked.provenance.explanation).toContain("200%");
  });

  it("is withheld entirely when consumption is unknown", () => {
    expect(computeOffsetPercent(10_000, null)).toBeNull();
    expect(computeOffsetPercent(null, 10_000)).toBeNull();
  });
});

// --- Consumption -----------------------------------------------------------

describe("consumption model", () => {
  it("sums twelve actual months at HIGH confidence", () => {
    const monthly = new Array(12).fill(1000);
    const r = deriveConsumption({ monthlyKwh: monthly });
    expect(r.basis).toBe("TWELVE_MONTHS_ACTUAL");
    expect(r.annualKwh!.value).toBe(12_000);
    expect(r.annualKwh!.provenance.confidence).toBe("HIGH");
  });

  it("extrapolates partial months and labels the extrapolation", () => {
    const r = deriveConsumption({ monthlyKwh: [1000, 1000, 1000, null, null, null, null, null, null, null, null, null] });
    expect(r.basis).toBe("PARTIAL_MONTHS_EXTRAPOLATED");
    expect(r.annualKwh!.value).toBe(12_000);
    expect(r.assumptions.join(" ")).toContain("scaled to a full year");
  });

  it("refuses to convert dollars without a rate", () => {
    const r = deriveConsumption({ averageMonthlyBillDollars: 220 });
    expect(r.annualKwh).toBeNull();
    expect(r.basis).toBe("UNKNOWN");
  });

  it("converts dollars with a rate, net of fixed charges, at LOW confidence", () => {
    const r = deriveConsumption({
      averageMonthlyBillDollars: 220,
      blendedRateDollarsPerKwh: 0.16,
      fixedMonthlyChargeDollars: 20,
    });
    // (220 - 20) * 12 / 0.16 = 15,000
    expect(r.annualKwh!.value).toBeCloseTo(15_000, 6);
    expect(r.annualKwh!.provenance.confidence).toBe("LOW");
    expect(r.basis).toBe("BILL_DOLLARS_APPROXIMATED");
  });

  it("never invents usage from nothing", () => {
    const r = deriveConsumption({});
    expect(r.annualKwh).toBeNull();
    expect(r.basis).toBe("UNKNOWN");
  });

  it("surfaces contradictory inputs instead of silently picking one", () => {
    const r = deriveConsumption({
      monthlyKwh: [2000, 2000, 2000, 2000, 2000, 2000, null, null, null, null, null, null],
      annualKwh: 7000,
    });
    expect(r.anomalies.length).toBeGreaterThan(0);
    expect(r.anomalies[0]).toContain("24,000");
  });
});

// --- Cost ------------------------------------------------------------------

describe("cost engine", () => {
  const config = DEFAULT_SOLAR_PRICING_CONFIG;

  it("selects the band by system size", () => {
    expect(bandForSystemSize(config, 4).maxKw).toBe(5);
    expect(bandForSystemSize(config, 8).maxKw).toBe(10);
    expect(bandForSystemSize(config, 40).maxKw).toBe(Infinity);
  });

  it("computes base cost as watts x $/W and rounds only at the total", () => {
    const result = generateCostEstimate({
      config,
      dcSystemSizeKw: 8,
      panelCount: 20,
      activeSegments: [{ index: 0, pitchDegrees: 20 }],
      analysis: fixtureAnalysis(),
      answers: {},
      incentives: [],
    });
    const base = result.lineItems.find((li) => li.category === "base_system")!;
    expect(base.lowAmount).toBeCloseTo(8000 * 2.7, 6);
    expect(base.highAmount).toBeCloseTo(8000 * 3.8, 6);
    // Totals are rounded to the configured step; line items are not.
    expect(result.installedCostLow % config.roundToNearest).toBe(0);
    expect(result.installedCostHigh % config.roundToNearest).toBe(0);
  });

  it("applies the steep-roof adder only from real roof geometry", () => {
    const withSteep = generateCostEstimate({
      config,
      dcSystemSizeKw: 8,
      panelCount: 20,
      activeSegments: [{ index: 0, pitchDegrees: 40 }],
      analysis: fixtureAnalysis(),
      answers: {},
      incentives: [],
    });
    expect(withSteep.lineItems.some((li) => li.description.includes("Steep-roof"))).toBe(true);

    // A manually described roof is not objective geometry, so it must not trigger it.
    const manual = { ...fixtureAnalysis(), isManual: true };
    const withManual = generateCostEstimate({
      config,
      dcSystemSizeKw: 8,
      panelCount: 20,
      activeSegments: [{ index: 0, pitchDegrees: 40 }],
      analysis: manual,
      answers: {},
      incentives: [],
    });
    expect(withManual.lineItems.some((li) => li.description.includes("Steep-roof"))).toBe(false);
  });

  it("never applies an electrical adder unless the homeowner said yes", () => {
    const unknown = generateCostEstimate({
      config,
      dcSystemSizeKw: 8,
      panelCount: 20,
      activeSegments: [{ index: 0, pitchDegrees: 20 }],
      analysis: fixtureAnalysis(),
      answers: { mainPanelUpgradeExpected: undefined },
      incentives: [],
    });
    expect(unknown.lineItems.some((li) => li.category === "electrical")).toBe(false);

    const yes = generateCostEstimate({
      config,
      dcSystemSizeKw: 8,
      panelCount: 20,
      activeSegments: [{ index: 0, pitchDegrees: 20 }],
      analysis: fixtureAnalysis(),
      answers: { mainPanelUpgradeExpected: true },
      incentives: [],
    });
    expect(yes.lineItems.some((li) => li.category === "electrical")).toBe(true);
  });

  it("computes no net cost when no incentive is verified", () => {
    const result = generateCostEstimate({
      config,
      dcSystemSizeKw: 8,
      panelCount: 20,
      activeSegments: [],
      analysis: fixtureAnalysis(),
      answers: {},
      incentives: [],
    });
    expect(result.netCostLow).toBeNull();
    expect(result.netCostHigh).toBeNull();
    expect(result.assumptions.join(" ")).toContain("No incentive has been verified");
  });

  it("lists but never monetises an incentive needing verification", () => {
    const program: IncentiveProgram = {
      id: "p1",
      name: "Example credit",
      jurisdiction: "Maryland",
      technology: "Solar Photovoltaic",
      incentiveType: "Tax credit",
      valueType: "PERCENT_OF_COST",
      value: 30,
      eligibilitySummary: "Owner-occupied",
      sourceName: "Example",
      sourceUrl: "https://example.gov",
      lastVerifiedAt: "2026-08-01",
      applicability: "REQUIRES_VERIFICATION",
      homeownerRequirements: [],
    };
    const result = generateCostEstimate({
      config,
      dcSystemSizeKw: 8,
      panelCount: 20,
      activeSegments: [],
      analysis: fixtureAnalysis(),
      answers: {},
      incentives: [program],
    });
    expect(result.appliedIncentives[0].includedInNetCost).toBe(false);
    expect(result.appliedIncentives[0].estimatedAmount).toBeNull();
    expect(result.netCostLow).toBeNull();
  });

  it("caps a monetised incentive at its stated maximum", () => {
    const program: IncentiveProgram = {
      id: "p2",
      name: "Capped rebate",
      jurisdiction: "Maryland",
      technology: "Solar Photovoltaic",
      incentiveType: "Rebate",
      valueType: "PERCENT_OF_COST",
      value: 50,
      maximumAmount: 1000,
      eligibilitySummary: "Any",
      sourceName: "Example",
      sourceUrl: "https://example.gov",
      lastVerifiedAt: "2026-08-01",
      applicability: "LIKELY_APPLICABLE",
      homeownerRequirements: [],
    };
    const result = generateCostEstimate({
      config,
      dcSystemSizeKw: 8,
      panelCount: 20,
      activeSegments: [],
      analysis: fixtureAnalysis(),
      answers: {},
      incentives: [program],
    });
    expect(result.appliedIncentives[0].estimatedAmount!.value).toBe(1000);
    expect(result.installedCostLow - result.netCostLow!).toBe(1000);
  });

  it("never produces a negative net cost", () => {
    const program: IncentiveProgram = {
      id: "p3",
      name: "Huge rebate",
      jurisdiction: "Maryland",
      technology: "Solar Photovoltaic",
      incentiveType: "Rebate",
      valueType: "FLAT_AMOUNT",
      value: 9_999_999,
      eligibilitySummary: "Any",
      sourceName: "Example",
      sourceUrl: "https://example.gov",
      lastVerifiedAt: "2026-08-01",
      applicability: "LIKELY_APPLICABLE",
      homeownerRequirements: [],
    };
    const result = generateCostEstimate({
      config,
      dcSystemSizeKw: 8,
      panelCount: 20,
      activeSegments: [],
      analysis: fixtureAnalysis(),
      answers: {},
      incentives: [program],
    });
    expect(result.netCostLow).toBe(0);
  });

  it("fails closed on public display when the pricing config is unapproved", () => {
    const result = generateCostEstimate({
      config,
      dcSystemSizeKw: 8,
      panelCount: 20,
      activeSegments: [],
      analysis: fixtureAnalysis(),
      answers: {},
      incentives: [],
    });
    // The default config is never the approved version in tests.
    expect(result.displayable).toBe(false);
    expect(result.withheldReason).toBeTruthy();
  });

  it("still records $/W consistent with the rounded totals", () => {
    const result = generateCostEstimate({
      config,
      dcSystemSizeKw: 10,
      panelCount: 24,
      activeSegments: [],
      analysis: fixtureAnalysis(),
      answers: {},
      incentives: [],
    });
    expect(result.dollarsPerWattLow).toBeCloseTo(result.installedCostLow / 10_000, 9);
    expect(result.dollarsPerWattHigh).toBeCloseTo(result.installedCostHigh / 10_000, 9);
  });
});

// --- Roof usage + adapter helpers -----------------------------------------

describe("roof usage and adapter helpers", () => {
  it("reports what fraction of the suitable roof is used", () => {
    expect(roofUsage(fixtureAnalysis(), 3).percentOfSuitableRoofUsed).toBeCloseTo(60, 6);
    expect(roofUsage(fixtureAnalysis(), 0).percentOfSuitableRoofUsed).toBe(0);
  });

  it("takes the median of an odd and an even sunshine distribution", () => {
    expect(medianOfQuantiles([1, 2, 3, 4, 5])).toBe(3);
    expect(medianOfQuantiles([1, 2, 3, 4])).toBe(2.5);
    expect(medianOfQuantiles([])).toBeUndefined();
    expect(medianOfQuantiles(undefined)).toBeUndefined();
  });

  it("normalises azimuth into 0–359", () => {
    expect(normalizeAzimuth(180)).toBe(180);
    expect(normalizeAzimuth(-90)).toBe(270);
    expect(normalizeAzimuth(400)).toBe(40);
  });
});
