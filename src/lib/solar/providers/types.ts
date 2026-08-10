/**
 * Provider interfaces (§11, §21, §26, §70).
 *
 * Each external capability is expressed as an interface so a provider can be
 * swapped or added without touching the planner, the engines, or the UI.
 * Adapters translate provider JSON into `src/lib/solar/types.ts` shapes and
 * are the only place a third-party response shape is allowed to exist.
 *
 * Every method returns a result union rather than throwing, because "this
 * source has no answer for this property" is an ordinary, expected outcome
 * that must produce a usable fallback rather than an error page (§37).
 */

import type {
  LatLng,
  NormalizedAddress,
  RoofLookupResult,
  NormalizedTariff,
  IncentiveProgram,
  ProductionModelOutput,
  SegmentProductionInput,
} from "../types";

export interface ProviderAvailability {
  /** Adapter identifier, e.g. "google-solar". */
  id: string;
  /** Human label for the methodology page and admin surface. */
  label: string;
  /** False when required credentials or flags are absent. */
  configured: boolean;
  /** Why it is unavailable, when it is. */
  reason?: string;
}

export interface GeocodeSuccess {
  ok: true;
  candidates: NormalizedAddress[];
}

export interface GeocodeFailure {
  ok: false;
  reason: "NO_RESULTS" | "PROVIDER_UNAVAILABLE" | "NOT_CONFIGURED" | "INVALID_INPUT";
  message: string;
}

export type GeocodeResult = GeocodeSuccess | GeocodeFailure;

export interface GeocodingProvider {
  readonly availability: ProviderAvailability;
  /**
   * Resolve free-text into normalized, coordinate-bearing candidates.
   * More than one candidate is a normal outcome and must be surfaced for the
   * homeowner to choose — never silently take the first (§9).
   */
  geocode(query: string, opts?: { signal?: AbortSignal }): Promise<GeocodeResult>;
}

export interface SolarGeospatialProvider {
  readonly availability: ProviderAvailability;
  /**
   * Find the building closest to the given point and return its roof analysis.
   * Implementations must not widen the search radius silently; a miss is a
   * `NO_COVERAGE`/`BUILDING_NOT_FOUND` failure that routes to manual roof mode.
   */
  findBuilding(location: LatLng, opts?: { signal?: AbortSignal }): Promise<RoofLookupResult>;
}

export interface ProductionModelProvider {
  readonly availability: ProviderAvailability;
  /**
   * Model AC production for a set of roof segments. Implementations model each
   * segment separately and aggregate — never an averaged tilt/azimuth (§16).
   */
  modelProduction(
    segments: SegmentProductionInput[],
    opts?: { systemLossesPercent?: number; signal?: AbortSignal },
  ): Promise<{ ok: true; output: ProductionModelOutput } | { ok: false; message: string }>;
}

export interface UtilityRateProvider {
  readonly availability: ProviderAvailability;
  /**
   * Look up residential tariffs serving a location. Returns every plausible
   * match — picking one is a homeowner decision, not the adapter's (§21).
   */
  findTariffs(
    location: LatLng,
    opts?: { signal?: AbortSignal; limit?: number },
  ): Promise<{ ok: true; tariffs: NormalizedTariff[] } | { ok: false; reason: string; message: string }>;
}

export interface IncentiveLookupContext {
  state?: string;
  county?: string;
  postalCode?: string;
  utilityName?: string;
  /** Used only to compute amounts for programs that are already verified. */
  systemSizeKw?: number;
  installedCostLow?: number;
  installedCostHigh?: number;
}

export interface IncentiveProvider {
  readonly availability: ProviderAvailability;
  /**
   * Return only programs whose source, effective dates and verification status
   * are recorded. An empty array is a correct answer and must render as
   * "could not be verified", never as "no incentives exist" (§26, §28).
   */
  findIncentives(
    ctx: IncentiveLookupContext,
    opts?: { signal?: AbortSignal },
  ): Promise<{ ok: true; programs: IncentiveProgram[] } | { ok: false; reason: string; message: string }>;
}

// ---------------------------------------------------------------------------
// Phase 2+ interfaces — declared so the architecture does not have to change
// when they are implemented. No stub implementations are registered; callers
// check `availability.configured` and take the manual path.
// ---------------------------------------------------------------------------

export interface BillExtractionDraft {
  utilityName?: { value: string; confidence: number };
  billingPeriodStart?: { value: string; confidence: number };
  billingPeriodEnd?: { value: string; confidence: number };
  kwhUsed?: { value: number; confidence: number };
  totalBillDollars?: { value: number; confidence: number };
  ratePlan?: { value: string; confidence: number };
}

export interface BillExtractionProvider {
  readonly availability: ProviderAvailability;
  /** Produces a DRAFT for homeowner confirmation. Never authoritative (§19). */
  extract(
    file: { bytes: Buffer; mimeType: string },
    opts?: { signal?: AbortSignal },
  ): Promise<{ ok: true; draft: BillExtractionDraft } | { ok: false; message: string }>;
}

export interface SolarImageryProvider {
  readonly availability: ProviderAvailability;
  /**
   * Phase 2. Returns a basemap the roof visualizer can render beneath the
   * geometry, together with the attribution text the licence requires and the
   * TTL after which the cached tile must be discarded (§52).
   */
  getBasemap(
    location: LatLng,
    opts: { zoom: number; widthPx: number; heightPx: number; signal?: AbortSignal },
  ): Promise<
    | { ok: true; imageUrl: string; attribution: string; cacheTtlSeconds: number }
    | { ok: false; message: string }
  >;
}
