/**
 * Solar pricing configuration (§23, §47).
 *
 * ------------------------------------------------------------------------
 *  READ THIS BEFORE CHANGING ANY NUMBER IN THIS FILE
 * ------------------------------------------------------------------------
 * These are NOT market data. Renovessa has not yet collected a single solar
 * contractor proposal, so there is no local $/W evidence to publish. The
 * values below exist so the engine has a shape to compute with, and they are
 * marked `dataBasis: "unvalidated_planning_default"` with `sampleCount: 0`.
 *
 * Public display of dollar figures is fail-closed behind
 * `NEXT_PUBLIC_APPROVED_SOLAR_PRICING_VERSION`, mirroring the existing
 * `NEXT_PUBLIC_APPROVED_ESTIMATE_MODEL_VERSION` control the bathroom
 * estimator uses. Until a reviewer publishes a configuration and sets that
 * env var to its exact version, the planner shows everything *except* prices.
 *
 * When real proposal data exists, an admin publishes a
 * `SolarEstimatorConfiguration` row; this default is then only a fallback for
 * internal/development use.
 */

import { DEFAULT_AGREEMENT_THRESHOLDS, type AgreementThresholds } from "./production";
import { PVWATTS_DEFAULT_LOSSES_PERCENT, MIN_MODELLED_TILT_DEGREES } from "./providers/pvwatts";

export type AdderTrigger =
  /** Derived from provider roof geometry — objective. */
  | "api_derived"
  /** The homeowner answered a question that implies it. */
  | "homeowner_answer"
  /** Neither: applied as a stated planning allowance. */
  | "assumption";

export interface PricingBand {
  /** Inclusive lower bound of the system-size band, kW DC. */
  minKw: number;
  /** Exclusive upper bound. Use Infinity for the top band. */
  maxKw: number;
  dollarsPerWattLow: number;
  dollarsPerWattHigh: number;
}

export interface CostAdder {
  key: string;
  category: string;
  label: string;
  lowAmount: number;
  highAmount: number;
  trigger: AdderTrigger;
  /** Shown in the cost breakdown so the homeowner knows why it applies. */
  reason: string;
}

export interface SolarPricingConfig {
  version: string;
  /** Which market these bands claim to describe. */
  market: string;
  /** How the numbers were arrived at. Surfaced in the UI and admin. */
  dataBasis: "unvalidated_planning_default" | "renovessa_market_data" | "reviewed_external_benchmark";
  /** Number of comparable local projects behind the bands. Zero means: no evidence. */
  sampleCount: number;
  /** ISO date the pricing became effective. */
  effectiveFrom: string;
  /** ISO date of the most recent sample, when there are samples. */
  mostRecentSampleDate?: string;
  reviewedBy?: string;

  bands: PricingBand[];
  adders: CostAdder[];

  /** Display rounding step for dollar ranges (§24 — no fake precision). */
  roundToNearest: number;

  production: {
    /**
     * DC→AC ratio used to make the provider's DC energy comparable with
     * PVWatts' AC energy. An assumption, labelled as one wherever it appears.
     */
    dcToAcDerate: number;
    systemLossesPercent: number;
    minModelledTiltDegrees: number;
    agreementThresholds: AgreementThresholds;
  };

  roof: {
    /** Imagery older than this prompts the "has anything changed?" question. */
    imageryStaleYears: number;
    /** Pitch at or above this counts as a steep-roof adder trigger. */
    steepPitchDegrees: number;
    /** Distinct roof planes at or above this count as a complex-roof trigger. */
    complexRoofSegmentCount: number;
  };

  economics: {
    /** Only used when the homeowner supplies no tariff and confirms a blended rate. */
    defaultAnalysisYears: number;
    annualDegradationPercent: number;
  };

  /**
   * SREC income projection. Per-state market price brackets ($/SREC) from
   * current market reporting — NOT guarantees. Absent state = no projection.
   * `certified*` describes Maryland's Brighter Tomorrow Act 1.5x multiplier
   * for qualifying rooftop systems; shown as an upside note, never the base.
   */
  srec: {
    yearsProjected: number;
    prices: Record<string, {
      low: number;
      high: number;
      certifiedFactor?: number;
      certifiedUntil?: string;
      certifiedNote?: string;
    }>;
  };
}

export const DEFAULT_SOLAR_PRICING_CONFIG: SolarPricingConfig = {
  version: "solar-pricing-default-2026-08-10-v1",
  market: "DMV (planning default — not market-derived)",
  dataBasis: "unvalidated_planning_default",
  sampleCount: 0,
  effectiveFrom: "2026-08-10",

  // Wide bands, deliberately. A narrow band would imply precision we do not have.
  bands: [
    { minKw: 0, maxKw: 5, dollarsPerWattLow: 3.0, dollarsPerWattHigh: 4.2 },
    { minKw: 5, maxKw: 10, dollarsPerWattLow: 2.7, dollarsPerWattHigh: 3.8 },
    { minKw: 10, maxKw: 15, dollarsPerWattLow: 2.5, dollarsPerWattHigh: 3.5 },
    { minKw: 15, maxKw: Infinity, dollarsPerWattLow: 2.3, dollarsPerWattHigh: 3.3 },
  ],

  adders: [
    {
      key: "steep_roof",
      category: "roof_access",
      label: "Steep-roof access allowance",
      lowAmount: 800,
      highAmount: 2500,
      trigger: "api_derived",
      reason: "One or more of your roof faces is steep enough to need additional fall protection and slower installation.",
    },
    {
      key: "complex_roof",
      category: "roof_access",
      label: "Multi-plane roof allowance",
      lowAmount: 600,
      highAmount: 2200,
      trigger: "api_derived",
      reason: "Panels are spread across several roof planes, which adds racking, wiring runs and labour.",
    },
    {
      key: "main_panel_upgrade",
      category: "electrical",
      label: "Main service panel work",
      lowAmount: 1800,
      highAmount: 5000,
      trigger: "homeowner_answer",
      reason: "You indicated your main electrical panel may need upgrading to accept a solar interconnection.",
    },
    {
      key: "service_upgrade",
      category: "electrical",
      label: "Utility service upgrade",
      lowAmount: 2500,
      highAmount: 7000,
      trigger: "homeowner_answer",
      reason: "You indicated a service upgrade is known or expected.",
    },
    {
      key: "detached_structure",
      category: "structural",
      label: "Detached structure / trenching",
      lowAmount: 2000,
      highAmount: 8000,
      trigger: "homeowner_answer",
      reason: "Part of the array would sit on a detached structure, requiring a separate feeder run.",
    },
    {
      key: "reroof_coordination",
      category: "roof_condition",
      label: "Re-roof coordination allowance",
      lowAmount: 500,
      highAmount: 1800,
      trigger: "homeowner_answer",
      reason: "You told us a roof replacement is planned, so the installation needs to be sequenced around it.",
    },
    {
      key: "permitting_interconnection",
      category: "permitting",
      label: "Permitting and interconnection allowance",
      lowAmount: 500,
      highAmount: 1500,
      trigger: "assumption",
      reason:
        "A planning allowance for local permitting and utility interconnection. Actual requirements and fees are set by your jurisdiction and utility, and must be confirmed by your installer.",
    },
  ],

  roundToNearest: 500,

  production: {
    dcToAcDerate: 0.85,
    systemLossesPercent: PVWATTS_DEFAULT_LOSSES_PERCENT,
    minModelledTiltDegrees: MIN_MODELLED_TILT_DEGREES,
    agreementThresholds: DEFAULT_AGREEMENT_THRESHOLDS,
  },

  roof: {
    imageryStaleYears: 3,
    steepPitchDegrees: 35,
    complexRoofSegmentCount: 3,
  },

  economics: {
    defaultAnalysisYears: 25,
    annualDegradationPercent: 0.5,
  },

  srec: {
    yearsProjected: 10,
    prices: {
      // Market reporting, Aug 2026: standard SRECs ~$50–$90; Certified (1.5x)
      // for rooftop ≤5 MW placed in service 2024-07-01 through 2028-01-01.
      MD: {
        low: 50,
        high: 90,
        certifiedFactor: 1.5,
        certifiedUntil: "2028-01-01",
        certifiedNote:
          "Rooftop systems placed in service before 2028-01-01 may qualify for Maryland Certified SRECs worth 1.5× the standard value (Brighter Tomorrow Act, 2024).",
      },
      // Market reporting, Aug 2026: DC SRECs ~$300–$425, highest in the region.
      DC: { low: 300, high: 425 },
    },
  },
};

/** Select the band covering a system size. Falls back to the top band. */
export function bandForSystemSize(config: SolarPricingConfig, dcKw: number): PricingBand {
  return (
    config.bands.find((b) => dcKw >= b.minKw && dcKw < b.maxKw) ??
    config.bands[config.bands.length - 1]
  );
}

/**
 * Is this pricing configuration approved for public dollar display?
 *
 * Fail-closed: an unset or mismatched env var withholds every dollar figure,
 * exactly as the bathroom estimator does for its own ranges.
 */
export function isPricingApprovedForDisplay(config: SolarPricingConfig): boolean {
  const approved = process.env.NEXT_PUBLIC_APPROVED_SOLAR_PRICING_VERSION?.trim();
  if (!approved) return false;
  return approved === config.version;
}

/** Merge an admin-published config over the built-in default. */
export function mergePricingConfig(
  published: Partial<SolarPricingConfig> | null | undefined,
  version?: string,
): SolarPricingConfig {
  if (!published) return DEFAULT_SOLAR_PRICING_CONFIG;
  return {
    ...DEFAULT_SOLAR_PRICING_CONFIG,
    ...published,
    version: version ?? published.version ?? DEFAULT_SOLAR_PRICING_CONFIG.version,
    production: { ...DEFAULT_SOLAR_PRICING_CONFIG.production, ...(published.production ?? {}) },
    roof: { ...DEFAULT_SOLAR_PRICING_CONFIG.roof, ...(published.roof ?? {}) },
    economics: { ...DEFAULT_SOLAR_PRICING_CONFIG.economics, ...(published.economics ?? {}) },
    srec: {
      ...DEFAULT_SOLAR_PRICING_CONFIG.srec,
      ...(published.srec ?? {}),
      prices: { ...DEFAULT_SOLAR_PRICING_CONFIG.srec.prices, ...(published.srec?.prices ?? {}) },
    },
    bands: published.bands?.length ? published.bands : DEFAULT_SOLAR_PRICING_CONFIG.bands,
    adders: published.adders?.length ? published.adders : DEFAULT_SOLAR_PRICING_CONFIG.adders,
  };
}
