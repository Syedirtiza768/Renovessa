/**
 * Feature flags for the Bathroom Remodeling Experience.
 *
 * All flags are env-driven and default OFF in production so the new module
 * cannot be reached until explicitly enabled. The legacy FIRST_JOB_MODE wedge
 * (HVAC / Fairfax) is independent and must not gate this experience.
 *
 * Flags map 1:1 to PRD §41.
 */

function flag(name: string, fallback = "false"): boolean {
  const value = process.env[name] ?? fallback;
  return value === "true" || value === "1" || value === "yes";
}

export const BATHROOM_ROCKVILLE_LANDING_ENABLED = flag("BATHROOM_ROCKVILLE_LANDING_ENABLED");
export const BATHROOM_LANDING_ENABLED = flag("BATHROOM_LANDING_ENABLED");
export const BATHROOM_PLANNER_ENABLED = flag("BATHROOM_PLANNER_ENABLED");
export const BATHROOM_DIAGRAM_BUILDER_ENABLED = flag("BATHROOM_DIAGRAM_BUILDER_ENABLED");
export const BATHROOM_AI_INTERPRETATION_ENABLED = flag("BATHROOM_AI_INTERPRETATION_ENABLED", "false");
export const BATHROOM_ESTIMATOR_ENABLED = flag("BATHROOM_ESTIMATOR_ENABLED");
export const BATHROOM_PERMIT_NAVIGATOR_ENABLED = flag("BATHROOM_PERMIT_NAVIGATOR_ENABLED");
export const BATHROOM_PROJECT_BRIEF_ENABLED = flag("BATHROOM_PROJECT_BRIEF_ENABLED");
export const BATHROOM_CONTRACTOR_MATCHING_ENABLED = flag("BATHROOM_CONTRACTOR_MATCHING_ENABLED");
export const BATHROOM_PROPOSAL_COMPARISON_ENABLED = flag("BATHROOM_PROPOSAL_COMPARISON_ENABLED");
/** White-label contractor proposal studio (independent of homeowner planner). */
export const BATHROOM_CONTRACTOR_STUDIO_ENABLED = flag("BATHROOM_CONTRACTOR_STUDIO_ENABLED");

/**
 * Convenience: is the public Rockville landing reachable at all?
 * Used by middleware/route guards to 404 the entire branch when off.
 */
export function bathroomRockvilleEnabled(): boolean {
  return BATHROOM_ROCKVILLE_LANDING_ENABLED;
}

/**
 * Convenience: is the generic (non-location-specific) bathroom landing reachable?
 * Used by the /bathroom-remodeling route guard.
 */
export function bathroomLandingEnabled(): boolean {
  return BATHROOM_LANDING_ENABLED || BATHROOM_DEMO_MODE;
}

/**
 * Convenience: are the core planning tools (planner + estimator) usable?
 * The landing page can be visible while the planner is disabled (read-only
 * authority content only).
 */
export function bathroomPlannerUsable(): boolean {
  return (BATHROOM_PLANNER_ENABLED || BATHROOM_DEMO_MODE) && (BATHROOM_ESTIMATOR_ENABLED || BATHROOM_DEMO_MODE);
}

/**
 * Convenience: is the deterministic estimator usable (preview endpoint + saved estimates)?
 * Independent of the planner shell so it can be exposed for API consumers.
 */
export function bathroomEstimatorEnabled(): boolean {
  return BATHROOM_ESTIMATOR_ENABLED || BATHROOM_DEMO_MODE;
}

/** Contractor white-label proposal studio. */
export function bathroomContractorStudioEnabled(): boolean {
  return BATHROOM_CONTRACTOR_STUDIO_ENABLED || BATHROOM_DEMO_MODE;
}

/**
 * Demo / dev convenience: when BATHROOM_DEMO_MODE=true, all flags are forced on
 * regardless of the individual env values. Used by the demo seed and local dev.
 */
export const BATHROOM_DEMO_MODE = flag("BATHROOM_DEMO_MODE");

// ---------------------------------------------------------------------------
// Solar experience (docs/planning/SOLAR_IMPLEMENTATION_NOTE.md)
// Independent of the bathroom flags. Defaults OFF.
// ---------------------------------------------------------------------------

/**
 * Solar flags are read at CALL time, not module-load time.
 *
 * The bathroom flags above are module-level constants, which Next inlines when
 * it statically prerenders a page — so a page gated on them bakes whatever the
 * env was during `next build`. Renovessa builds one Docker image and supplies
 * env at container start, so that would freeze the flag at image-build time.
 * Reading per call keeps the runtime env authoritative in any rendering mode.
 */
function solarDemoMode(): boolean {
  return flag("SOLAR_DEMO_MODE");
}

export function solarLandingEnabled(): boolean {
  return flag("SOLAR_LANDING_ENABLED") || solarDemoMode();
}

/** Is the planner reachable at all? The landing page can be live while it is not. */
export function solarPlannerUsable(): boolean {
  return flag("SOLAR_PLANNER_ENABLED") || solarDemoMode();
}

/** Google Solar API roof analysis. When off, the planner runs manual-roof only. */
export function solarGeospatialEnabled(): boolean {
  return flag("SOLAR_GEOSPATIAL_ENABLED") || solarDemoMode();
}

/** NREL PVWatts v8, the second production model. */
export function solarPvwattsEnabled(): boolean {
  return flag("SOLAR_PVWATTS_ENABLED") || solarDemoMode();
}

/** OpenEI utility rate lookup. */
export function solarUtilityRatesEnabled(): boolean {
  return flag("SOLAR_UTILITY_RATES_ENABLED") || solarDemoMode();
}

/** Incentive display. Even when on, nothing shows unless verified programs exist. */
export function solarIncentivesEnabled(): boolean {
  return flag("SOLAR_INCENTIVES_ENABLED") || solarDemoMode();
}

/** Battery / storage branch (Phase 3). */
export function solarStorageEnabled(): boolean {
  return flag("SOLAR_STORAGE_ENABLED");
}

/** Contractor-ready brief + RFP promotion. */
export function solarBriefEnabled(): boolean {
  return flag("SOLAR_PROJECT_BRIEF_ENABLED") || solarDemoMode();
}

export function solarFlagSnapshot() {
  return {
    landing: solarLandingEnabled(),
    planner: solarPlannerUsable(),
    geospatial: solarGeospatialEnabled(),
    pvwatts: solarPvwattsEnabled(),
    utilityRates: solarUtilityRatesEnabled(),
    incentives: solarIncentivesEnabled(),
    storage: solarStorageEnabled(),
    projectBrief: solarBriefEnabled(),
    demoMode: solarDemoMode(),
  };
}

export type SolarFlags = ReturnType<typeof solarFlagSnapshot>;

export function bathroomFlagSnapshot() {
  return {
    landing: BATHROOM_ROCKVILLE_LANDING_ENABLED || BATHROOM_LANDING_ENABLED || BATHROOM_DEMO_MODE,
    planner: BATHROOM_PLANNER_ENABLED || BATHROOM_DEMO_MODE,
    diagramBuilder: BATHROOM_DIAGRAM_BUILDER_ENABLED || BATHROOM_DEMO_MODE,
    aiInterpretation: BATHROOM_AI_INTERPRETATION_ENABLED,
    estimator: BATHROOM_ESTIMATOR_ENABLED || BATHROOM_DEMO_MODE,
    permitNavigator: BATHROOM_PERMIT_NAVIGATOR_ENABLED || BATHROOM_DEMO_MODE,
    projectBrief: BATHROOM_PROJECT_BRIEF_ENABLED || BATHROOM_DEMO_MODE,
    contractorMatching: BATHROOM_CONTRACTOR_MATCHING_ENABLED,
    proposalComparison: BATHROOM_PROPOSAL_COMPARISON_ENABLED,
    contractorStudio: BATHROOM_CONTRACTOR_STUDIO_ENABLED || BATHROOM_DEMO_MODE,
    demoMode: BATHROOM_DEMO_MODE,
  };
}
