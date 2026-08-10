/**
 * Failure-state coverage (§57 — the no-dead-end requirement).
 *
 * Every external dependency must degrade into a usable state rather than an
 * error. These tests walk the property scenarios from §61 and assert that each
 * one still produces a plan a homeowner can act on.
 */

import { describe, it, expect } from "vitest";
import { buildPlan } from "../plan";
import { buildManualRoofAnalysis } from "../manual-roof";
import { DEFAULT_SOLAR_PRICING_CONFIG } from "../pricing-config";
import { GoogleSolarProvider } from "../providers/google-solar";
import { scorePlanningConfidence } from "../confidence";
import { deriveConsumption } from "../consumption";
import { reconcileProduction } from "../production";
import type { RoofAnalysis, ProductionModelOutput } from "../types";

const config = DEFAULT_SOLAR_PRICING_CONFIG;

function providerAnalysis(overrides: Partial<RoofAnalysis> = {}): RoofAnalysis {
  return {
    providerId: "google-solar",
    isManual: false,
    buildingCenter: { latitude: 39.084, longitude: -77.153 },
    imageryDate: "2025-06-01",
    imageryQuality: "HIGH",
    segments: [
      {
        index: 0,
        pitchDegrees: 25,
        azimuthDegrees: 180,
        areaMeters2: 60,
        center: { latitude: 39.084, longitude: -77.153 },
        boundingBox: {
          sw: { latitude: 39.0838, longitude: -77.1532 },
          ne: { latitude: 39.0842, longitude: -77.1528 },
        },
        sunshineQuantiles: [900, 1100, 1300],
        medianSunshineHours: 1100,
      },
    ],
    candidatePanels: Array.from({ length: 20 }, (_, i) => ({
      id: `0:${i}`,
      segmentIndex: 0,
      center: { latitude: 39.084 + i * 0.00001, longitude: -77.153 },
      orientation: "LANDSCAPE" as const,
      yearlyEnergyDcKwh: 600 - i,
    })),
    panelSpec: { capacityWatts: 430, heightMeters: 1.879, widthMeters: 1.045, source: "provider_layout_model" },
    maxPanelCount: 20,
    retrievedAt: new Date().toISOString(),
    ...overrides,
  };
}

const pvwatts = (annual: number): ProductionModelOutput => ({
  modelId: "PVWATTS_V8",
  annualAcKwh: annual,
  monthlyAcKwh: new Array(12).fill(annual / 12),
  notes: [],
});

function basePlanInput() {
  return {
    config,
    analysis: providerAnalysis(),
    buildingConfirmed: true,
    strategy: "MAXIMIZE_PRODUCTION" as const,
    consumption: { annualKwh: 13_000 },
    pvwattsOutput: pvwatts(10_500),
    pvwattsFailure: null,
    answers: {},
    electricalInfoComplete: true,
    incentives: [],
    incentiveLookupFailed: false,
  };
}

describe("no-dead-end: external failures still produce a usable plan", () => {
  it("no Solar API coverage → manual roof still produces a system and production", () => {
    const manual = buildManualRoofAnalysis({
      location: { latitude: 39.084, longitude: -77.153 },
      faces: [{ azimuthDegrees: 180, pitchDegrees: 27, areaSquareFeet: 600 }],
    });

    const plan = buildPlan({
      ...basePlanInput(),
      analysis: manual,
      pvwattsOutput: pvwatts(9_000),
    });

    expect(plan.system.panelCount.value).toBeGreaterThan(0);
    expect(plan.production.annualAcKwh?.value).toBe(9_000);
    // Google's per-panel model can't run on a described roof, so it must be
    // reported as a single-model result, not silently treated as agreement.
    expect(plan.production.agreement).toBe("SINGLE_MODEL");
    expect(plan.confidence.overall).toBe("PRELIMINARY");
    expect(plan.outstandingVerification[0]).toContain("manually described roof");
  });

  it("manual roof never fabricates per-panel energy", () => {
    const manual = buildManualRoofAnalysis({
      location: { latitude: 39.084, longitude: -77.153 },
      faces: [{ azimuthDegrees: 180, pitchDegrees: 27, areaSquareFeet: 600 }],
    });
    expect(manual.candidatePanels.every((p) => p.yearlyEnergyDcKwh === 0)).toBe(true);
    expect(manual.imageryQuality).toBe("UNKNOWN");
    expect(manual.segments[0].sunshineQuantiles).toBeUndefined();
  });

  it("PVWatts failure → single-model production with a wider range, not an error", () => {
    const plan = buildPlan({
      ...basePlanInput(),
      pvwattsOutput: null,
      pvwattsFailure: "PVWatts did not respond",
    });

    expect(plan.production.annualAcKwh).not.toBeNull();
    expect(plan.production.agreement).toBe("SINGLE_MODEL");
    expect(plan.production.failures.some((f) => f.modelId === "PVWATTS_V8")).toBe(true);
    const spread = plan.production.rangeHighKwh!.value - plan.production.rangeLowKwh!.value;
    expect(spread).toBeGreaterThan(0);
  });

  it("both models failing withholds production but keeps the rest of the plan", () => {
    const plan = buildPlan({
      ...basePlanInput(),
      analysis: providerAnalysis({ candidatePanels: [] }),
      pvwattsOutput: null,
      pvwattsFailure: "PVWatts did not respond",
    });

    expect(plan.production.annualAcKwh).toBeNull();
    expect(plan.offsetPercent).toBeNull();
    // The cost engine still runs, and confidence explains why production is missing.
    expect(plan.cost.lineItems.length).toBeGreaterThan(0);
    expect(plan.confidence.dimensions.find((d) => d.key === "production")!.level).toBe("PRELIMINARY");
    expect(plan.outstandingVerification.join(" ")).toContain("no production model succeeded");
  });

  it("zero suitable panel positions is reported honestly, not as a zero-watt system", () => {
    const plan = buildPlan({
      ...basePlanInput(),
      analysis: providerAnalysis({ candidatePanels: [], maxPanelCount: 0 }),
      pvwattsOutput: null,
      pvwattsFailure: "No panels selected",
    });
    expect(plan.system.panelCount.value).toBe(0);
    expect(plan.roofUsage.maxPanelCount).toBe(0);
    expect(plan.production.annualAcKwh).toBeNull();
  });

  it("no electricity usage → roof and production still shown, offset withheld", () => {
    const plan = buildPlan({ ...basePlanInput(), consumption: {} });
    expect(plan.production.annualAcKwh).not.toBeNull();
    expect(plan.consumption.annualKwh).toBeNull();
    expect(plan.offsetPercent).toBeNull();
    expect(plan.confidence.dimensions.find((d) => d.key === "energy")!.level).toBe("PRELIMINARY");
  });

  it("no incentive data excludes incentives without dragging the whole plan down", () => {
    const plan = buildPlan({ ...basePlanInput(), incentiveLookupFailed: true });
    expect(plan.cost.netCostLow).toBeNull();
    expect(plan.confidence.dimensions.find((d) => d.key === "incentive")!.level).toBe("PRELIMINARY");

    // The incentive dimension is excluded from the overall roll-up on purpose:
    // a homeowner with a good roof analysis and 12 months of bills still has a
    // good plan in a jurisdiction where we've verified no programs. Assert the
    // roll-up equals the worst of the *other* dimensions, whatever that is.
    const rank = { HIGH: 0, MEDIUM: 1, PRELIMINARY: 2 } as const;
    const worstNonIncentive = plan.confidence.dimensions
      .filter((d) => d.key !== "incentive")
      .reduce((acc, d) => (rank[d.level] > rank[acc] ? d.level : acc), "HIGH" as typeof plan.confidence.overall);
    expect(plan.confidence.overall).toBe(worstNonIncentive);

    // And with incentives present, the overall is unchanged.
    const withIncentives = buildPlan({ ...basePlanInput(), incentiveLookupFailed: false });
    expect(withIncentives.confidence.overall).toBe(plan.confidence.overall);
  });

  it("unapproved pricing withholds dollars but keeps every other result", () => {
    const plan = buildPlan(basePlanInput());
    expect(plan.cost.displayable).toBe(false);
    expect(plan.system.dcSystemSizeKw.value).toBeGreaterThan(0);
    expect(plan.production.annualAcKwh).not.toBeNull();
    expect(plan.offsetPercent).not.toBeNull();
  });

  it("an unconfirmed building lowers roof confidence rather than blocking the plan", () => {
    const plan = buildPlan({ ...basePlanInput(), buildingConfirmed: false });
    const roof = plan.confidence.dimensions.find((d) => d.key === "roof")!;
    expect(roof.level).not.toBe("HIGH");
    expect(roof.improvements.join(" ")).toContain("Confirm the building");
  });

  it("stale imagery prompts the change question and lowers confidence", () => {
    const old = providerAnalysis({ imageryDate: "2018-01-01" });
    const plan = buildPlan({ ...basePlanInput(), analysis: old });
    const roof = plan.confidence.dimensions.find((d) => d.key === "roof")!;
    expect(roof.reasons.join(" ")).toContain("years old");
    expect(roof.improvements.join(" ")).toContain("changed");
  });

  it("a homeowner-reported property change drops roof confidence to preliminary", () => {
    const plan = buildPlan({
      ...basePlanInput(),
      analysis: providerAnalysis({ imageryDate: "2018-01-01" }),
      propertyChangedSinceImagery: true,
    });
    expect(plan.confidence.dimensions.find((d) => d.key === "roof")!.level).toBe("PRELIMINARY");
  });

  it("a heavily shaded, low-quality-imagery property still plans, at lower confidence", () => {
    const plan = buildPlan({
      ...basePlanInput(),
      analysis: providerAnalysis({ imageryQuality: "LOW" }),
    });
    expect(plan.system.panelCount.value).toBeGreaterThan(0);
    expect(plan.confidence.dimensions.find((d) => d.key === "roof")!.level).toBe("MEDIUM");
  });
});

describe("provider adapter failure mapping", () => {
  const provider = new GoogleSolarProvider("test-key");

  it("routes an invalid location to re-entering the address", async () => {
    const result = await provider.findBuilding({ latitude: NaN, longitude: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("INVALID_LOCATION");
      expect(result.recovery).toBe("REENTER_ADDRESS");
    }
  });

  it("routes a missing key to manual roof rather than an error", async () => {
    const unconfigured = new GoogleSolarProvider(undefined);
    const result = await unconfigured.findBuilding({ latitude: 39, longitude: -77 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("NOT_CONFIGURED");
      expect(result.recovery).toBe("MANUAL_ROOF");
      expect(result.message).not.toMatch(/api|key|token/i);
    }
  });

  it("refuses to normalize a payload with no panel specification", () => {
    // Without a panel wattage we cannot size a system honestly, so the adapter
    // must bail to the manual path rather than assume one.
    const normalized = provider.normalize(
      {
        center: { latitude: 39, longitude: -77 },
        solarPotential: { maxArrayPanelsCount: 10, roofSegmentStats: [] },
      },
      new Date().toISOString(),
    );
    expect(normalized).toBeNull();
  });

  it("drops candidate panels whose roof segment could not be normalized", () => {
    const normalized = provider.normalize(
      {
        center: { latitude: 39, longitude: -77 },
        imageryQuality: "HIGH",
        solarPotential: {
          panelCapacityWatts: 400,
          panelHeightMeters: 1.8,
          panelWidthMeters: 1.0,
          maxArrayPanelsCount: 3,
          roofSegmentStats: [
            {
              pitchDegrees: 20,
              azimuthDegrees: 180,
              center: { latitude: 39, longitude: -77 },
              boundingBox: { sw: { latitude: 38.9, longitude: -77.1 }, ne: { latitude: 39.1, longitude: -76.9 } },
              stats: { areaMeters2: 50, sunshineQuantiles: [1, 2, 3] },
            },
          ],
          solarPanels: [
            { center: { latitude: 39, longitude: -77 }, segmentIndex: 0, yearlyEnergyDcKwh: 500 },
            // Segment 7 does not exist: this panel cannot be modelled per segment.
            { center: { latitude: 39, longitude: -77 }, segmentIndex: 7, yearlyEnergyDcKwh: 500 },
          ],
        },
      },
      new Date().toISOString(),
    );
    expect(normalized).not.toBeNull();
    expect(normalized!.candidatePanels).toHaveLength(1);
    // maxPanelCount can never exceed the positions we actually hold.
    expect(normalized!.maxPanelCount).toBe(1);
  });
});

describe("confidence never silently upgrades a weak input", () => {
  it("is preliminary when the roof was described rather than measured", () => {
    const manual = buildManualRoofAnalysis({
      location: { latitude: 39, longitude: -77 },
      faces: [{ azimuthDegrees: 180, pitchDegrees: 27, areaSquareFeet: 600 }],
    });
    const confidence = scorePlanningConfidence({
      analysis: manual,
      buildingConfirmed: true,
      imageryStaleYears: 3,
      consumption: deriveConsumption({ monthlyKwh: new Array(12).fill(1000) }),
      production: reconcileProduction({ models: [pvwatts(10_000)], failures: [] }),
      cost: {
        lineItems: [],
        installedCostLow: 0,
        installedCostHigh: 0,
        dollarsPerWattLow: 0,
        dollarsPerWattHigh: 0,
        netCostLow: null,
        netCostHigh: null,
        appliedIncentives: [],
        assumptions: [],
        exclusions: [],
        costDrivers: [],
        pricingConfigVersion: "test",
        calculationVersion: "test",
        displayable: true,
      },
      electricalInfoComplete: true,
      incentiveCount: 0,
      incentiveLookupFailed: false,
    });
    expect(confidence.overall).toBe("PRELIMINARY");
  });
});
