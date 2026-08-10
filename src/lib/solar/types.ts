/**
 * Solar domain types.
 *
 * These are Renovessa's vocabulary. No third-party JSON shape appears here —
 * provider adapters in `providers/` translate into these and nothing else
 * downstream ever sees a raw API payload (§63).
 */

import type { Tracked, MaybeTracked } from "./provenance";

// ---------------------------------------------------------------------------
// Geography
// ---------------------------------------------------------------------------

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface BoundingBox {
  sw: LatLng;
  ne: LatLng;
}

export interface NormalizedAddress {
  formatted: string;
  streetLine?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  county?: string;
  country?: string;
  location: LatLng;
  /** Provider's own confidence in the geocode: ROOFTOP is what we want. */
  locationQuality: "ROOFTOP" | "RANGE_INTERPOLATED" | "GEOMETRIC_CENTER" | "APPROXIMATE" | "UNKNOWN";
  providerPlaceId?: string;
}

// ---------------------------------------------------------------------------
// Roof
// ---------------------------------------------------------------------------

export type ImageryQuality = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

/**
 * One roof plane. `sunshineQuantiles` is the provider's distribution of annual
 * sunshine hours across the segment (index 0 = min, last = max); we use the
 * median for display and never invent values when it is absent.
 */
export interface RoofSegment {
  /** Provider segment index — the join key for panels. Stable within one analysis. */
  index: number;
  pitchDegrees: number;
  /** Degrees clockwise from true north that the plane faces. */
  azimuthDegrees: number;
  areaMeters2: number;
  groundAreaMeters2?: number;
  center: LatLng;
  boundingBox: BoundingBox;
  /** Annual sunshine hours distribution across the plane, if provided. */
  sunshineQuantiles?: number[];
  /** Median annual sunshine hours, derived from the quantiles. */
  medianSunshineHours?: number;
  planeHeightAtCenterMeters?: number;
}

export type PanelOrientation = "LANDSCAPE" | "PORTRAIT";

/** A candidate panel position produced by the provider's layout model. */
export interface CandidatePanel {
  /** Stable id: `${segmentIndex}:${indexWithinAnalysis}`. */
  id: string;
  segmentIndex: number;
  center: LatLng;
  orientation: PanelOrientation;
  /** Provider's modelled first-year DC output for a panel in this position. */
  yearlyEnergyDcKwh: number;
}

/**
 * The layout model's panel specification. Comes from the provider — the code
 * must never assume 400 W (§14).
 */
export interface PanelSpecification {
  capacityWatts: number;
  heightMeters: number;
  widthMeters: number;
  lifetimeYears?: number;
  /** Where this spec came from: the geospatial layout model, or a catalog module. */
  source: "provider_layout_model" | "equipment_catalog";
  manufacturer?: string;
  model?: string;
}

export interface RoofAnalysis {
  /** Which adapter produced this. */
  providerId: string;
  /** True when this came from homeowner-entered roof faces rather than a provider. */
  isManual: boolean;
  buildingCenter: LatLng;
  boundingBox?: BoundingBox;
  imageryDate?: string;
  imageryProcessedDate?: string;
  imageryQuality: ImageryQuality;
  segments: RoofSegment[];
  candidatePanels: CandidatePanel[];
  panelSpec: PanelSpecification;
  maxPanelCount: number;
  maxArrayAreaMeters2?: number;
  maxSunshineHoursPerYear?: number;
  wholeRoofAreaMeters2?: number;
  /** kg CO2e per MWh displaced on the local grid, if the provider supplies it. */
  carbonOffsetFactorKgPerMwh?: number;
  retrievedAt: string;
  /** Postal/administrative context the provider resolved, useful for pricing market lookup. */
  postalCode?: string;
  administrativeArea?: string;
}

/** Why a building lookup failed — each maps to a distinct, non-dead-end UI path. */
export type RoofLookupFailureReason =
  | "NO_COVERAGE"
  | "BUILDING_NOT_FOUND"
  | "PROVIDER_UNAVAILABLE"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "NOT_CONFIGURED"
  | "INVALID_LOCATION";

export interface RoofLookupFailure {
  ok: false;
  reason: RoofLookupFailureReason;
  /** Homeowner-facing sentence. Never a raw provider error. */
  message: string;
  /** What the planner should offer next. */
  recovery: "RETRY" | "MANUAL_ROOF" | "REENTER_ADDRESS";
  retryable: boolean;
}

export type RoofLookupResult = { ok: true; analysis: RoofAnalysis } | RoofLookupFailure;

// ---------------------------------------------------------------------------
// System configuration
// ---------------------------------------------------------------------------

export type LayoutStrategy = "MAXIMIZE_PRODUCTION" | "TARGET_OFFSET" | "MAXIMIZE_COUNT" | "MANUAL";

export interface PanelLayoutSelection {
  strategy: LayoutStrategy;
  /** Ids from `RoofAnalysis.candidatePanels`, in selection order. */
  selectedPanelIds: string[];
  /** Segment indices the homeowner has switched off. */
  excludedSegmentIndices: number[];
  /** Only meaningful for TARGET_OFFSET. 0–1. */
  targetOffsetFraction?: number;
}

export interface SystemSize {
  panelCount: Tracked<number>;
  panelCapacityWatts: Tracked<number>;
  dcSystemSizeKw: Tracked<number>;
}

// ---------------------------------------------------------------------------
// Production
// ---------------------------------------------------------------------------

export type ProductionModelId = "GOOGLE_SOLAR" | "PVWATTS_V8" | "PVGIS_V52";

export interface SegmentProductionInput {
  segmentIndex: number;
  panelCount: number;
  capacityKw: number;
  tiltDegrees: number;
  azimuthDegrees: number;
  location: LatLng;
  /** True when the real pitch was below the modelling floor and was raised. */
  tiltWasAdjusted: boolean;
}

export interface ProductionModelOutput {
  modelId: ProductionModelId;
  annualAcKwh: number;
  /** Jan–Dec. Empty when the model did not return a monthly breakdown. */
  monthlyAcKwh: number[];
  /** Per-segment detail where the model ran per segment. */
  bySegment?: Array<{ segmentIndex: number; annualAcKwh: number }>;
  notes: string[];
}

export type ModelAgreement = "HIGH" | "NORMAL" | "MODERATE" | "INVESTIGATE" | "SINGLE_MODEL" | "NONE";

export interface ReconciledProduction {
  /** null when no model succeeded — production is then withheld entirely. */
  annualAcKwh: MaybeTracked<number>;
  rangeLowKwh: MaybeTracked<number>;
  rangeHighKwh: MaybeTracked<number>;
  monthlyAcKwh: MaybeTracked<number[]>;
  agreement: ModelAgreement;
  differencePercent: number | null;
  models: ProductionModelOutput[];
  failures: Array<{ modelId: ProductionModelId; message: string }>;
  assumptions: string[];
  calculationVersion: string;
}

// ---------------------------------------------------------------------------
// Consumption
// ---------------------------------------------------------------------------

export type ConsumptionBasis =
  | "TWELVE_MONTHS_ACTUAL"
  | "UTILITY_ANNUAL"
  | "PARTIAL_MONTHS_EXTRAPOLATED"
  | "HOMEOWNER_ANNUAL"
  | "HOMEOWNER_MONTHLY"
  | "BILL_DOLLARS_APPROXIMATED"
  | "UNKNOWN";

export interface ConsumptionInput {
  /** Ordered Jan-first where known; sparse arrays are allowed. */
  monthlyKwh?: Array<number | null>;
  annualKwh?: number;
  utilityProvidedAnnualKwh?: number;
  averageMonthlyBillDollars?: number;
  /** Homeowner-confirmed blended rate, $/kWh. Required to use bill dollars. */
  blendedRateDollarsPerKwh?: number;
  /** Fixed monthly charges to subtract before converting dollars to kWh. */
  fixedMonthlyChargeDollars?: number;
}

export interface ConsumptionResult {
  /** null when nothing usable was supplied — never defaulted to a national average. */
  annualKwh: MaybeTracked<number>;
  monthlyKwh: MaybeTracked<number[]>;
  basis: ConsumptionBasis;
  assumptions: string[];
  /** Contradictions we want the homeowner to reconcile (§32G). */
  anomalies: string[];
  calculationVersion: string;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

export interface NormalizedTariff {
  providerId: string;
  tariffId: string;
  utilityName: string;
  tariffName: string;
  sector: string;
  /** ISO date the tariff took effect, per the source. */
  effectiveDate?: string;
  /** Flat/blended energy rate in $/kWh where the structure is simple enough to reduce. */
  blendedEnergyRateDollarsPerKwh?: number;
  fixedMonthlyChargeDollars?: number;
  /** True when the tariff has time-of-use or tiered structure we did not reduce. */
  hasComplexStructure: boolean;
  sourceUri?: string;
  retrievedAt: string;
  /** Set only once the homeowner explicitly says "yes, this is my rate plan". */
  homeownerConfirmed: boolean;
}

// ---------------------------------------------------------------------------
// Incentives
// ---------------------------------------------------------------------------

export type IncentiveApplicability = "POTENTIALLY_APPLICABLE" | "LIKELY_APPLICABLE" | "REQUIRES_VERIFICATION";

export type IncentiveValueType = "PERCENT_OF_COST" | "DOLLARS_PER_WATT" | "FLAT_AMOUNT" | "OTHER";

export interface IncentiveProgram {
  id: string;
  name: string;
  jurisdiction: string;
  administrator?: string;
  technology: string;
  incentiveType: string;
  valueType: IncentiveValueType;
  /** Interpreted against valueType. Absent for OTHER, which is never monetised. */
  value?: number;
  maximumAmount?: number;
  eligibilitySummary: string;
  effectiveFrom?: string;
  expiresOn?: string;
  sourceName: string;
  sourceUrl: string;
  lastVerifiedAt: string;
  verifiedBy?: string;
  applicability: IncentiveApplicability;
  /** What the homeowner must still establish before relying on it. */
  homeownerRequirements: string[];
}

export interface AppliedIncentive {
  program: IncentiveProgram;
  /** Only present when the program is monetisable AND applicability is not REQUIRES_VERIFICATION. */
  estimatedAmount: MaybeTracked<number>;
  includedInNetCost: boolean;
  reasonExcluded?: string;
}

// ---------------------------------------------------------------------------
// Cost
// ---------------------------------------------------------------------------

export interface CostLineItem {
  category: string;
  description: string;
  lowAmount: number;
  highAmount: number;
  /** How this line was arrived at, e.g. "8400 W x $2.60–$3.20/W". */
  calculationReference: string;
  /** Why the line applies at all — API-derived, homeowner answer, or assumption. */
  triggerBasis: "api_derived" | "homeowner_answer" | "assumption" | "always";
  sortOrder: number;
}

export interface CostEstimate {
  lineItems: CostLineItem[];
  installedCostLow: number;
  installedCostHigh: number;
  dollarsPerWattLow: number;
  dollarsPerWattHigh: number;
  /** Gross minus verified incentives. null when no incentive was verified. */
  netCostLow: number | null;
  netCostHigh: number | null;
  appliedIncentives: AppliedIncentive[];
  assumptions: string[];
  exclusions: string[];
  costDrivers: string[];
  pricingConfigVersion: string;
  calculationVersion: string;
  /** False when the pricing config has not been approved for public display. */
  displayable: boolean;
  withheldReason?: string;
}

// ---------------------------------------------------------------------------
// Confidence
// ---------------------------------------------------------------------------

export type ConfidenceLevelName = "HIGH" | "MEDIUM" | "PRELIMINARY";

export interface ConfidenceDimension {
  key: "roof" | "energy" | "production" | "pricing" | "incentive";
  label: string;
  level: ConfidenceLevelName;
  reasons: string[];
  improvements: string[];
}

export interface PlanningConfidence {
  overall: ConfidenceLevelName;
  dimensions: ConfidenceDimension[];
  /** De-duplicated, ordered by impact — drives the "improve your estimate" UI. */
  topImprovements: string[];
  calculationVersion: string;
}

// ---------------------------------------------------------------------------
// Composite result
// ---------------------------------------------------------------------------

export interface SolarPlanResult {
  system: SystemSize;
  production: ReconciledProduction;
  consumption: ConsumptionResult;
  offsetPercent: MaybeTracked<number>;
  cost: CostEstimate;
  confidence: PlanningConfidence;
  roofUsage: {
    usedPanelCount: number;
    maxPanelCount: number;
    percentOfSuitableRoofUsed: number;
  };
  outstandingVerification: string[];
}
