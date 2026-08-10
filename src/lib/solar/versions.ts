/**
 * Immutable version identifiers for every solar calculation stage.
 *
 * Every persisted estimate stores these so a result produced today stays
 * explainable after the engines or pricing rules change (§48).
 *
 * Bump the relevant constant whenever the maths changes in a way that would
 * produce a different number from the same inputs. Never mutate history.
 */

/** Panel selection + system sizing. */
export const LAYOUT_ENGINE_VERSION = "solar-layout-2026-08-10-v1";

/** Production modelling and the two-model reconciliation rules. */
export const PRODUCTION_MODEL_VERSION = "solar-production-2026-08-10-v1";

/** Consumption derivation / extrapolation rules. */
export const CONSUMPTION_MODEL_VERSION = "solar-consumption-2026-08-10-v1";

/** Deterministic installed-cost engine (the engine, not the price data). */
export const COST_ENGINE_VERSION = "solar-cost-engine-2026-08-10-v1";

/** Savings / economics model. */
export const ECONOMICS_MODEL_VERSION = "solar-economics-2026-08-10-v1";

/** Confidence scoring rules. */
export const CONFIDENCE_MODEL_VERSION = "solar-confidence-2026-08-10-v1";

/** Contractor brief schema. */
export const BRIEF_SCHEMA_VERSION = "solar-brief-2026-08-10-v1";

/** Third-party model/API versions we pin against. */
export const PVWATTS_API_VERSION = "pvwatts-v8";
export const GOOGLE_SOLAR_API_VERSION = "solar-v1-buildingInsights";
export const OPENEI_API_VERSION = "urdb-v7";

/**
 * Snapshot stored on every SolarCostEstimate row. Together with the pricing
 * configuration version and the input snapshot, this is what makes an old
 * estimate reproducible.
 */
export function calculationVersionSnapshot() {
  return {
    layout: LAYOUT_ENGINE_VERSION,
    production: PRODUCTION_MODEL_VERSION,
    consumption: CONSUMPTION_MODEL_VERSION,
    cost: COST_ENGINE_VERSION,
    economics: ECONOMICS_MODEL_VERSION,
    confidence: CONFIDENCE_MODEL_VERSION,
    brief: BRIEF_SCHEMA_VERSION,
    externalApis: {
      pvwatts: PVWATTS_API_VERSION,
      googleSolar: GOOGLE_SOLAR_API_VERSION,
      openei: OPENEI_API_VERSION,
    },
  };
}

export type CalculationVersionSnapshot = ReturnType<typeof calculationVersionSnapshot>;
