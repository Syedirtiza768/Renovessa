/**
 * Provider registry.
 *
 * Route handlers resolve providers here rather than constructing adapters, so
 * swapping a provider is a one-line change and availability can be reported
 * honestly on the methodology page and in admin.
 *
 * Server-only: these modules read API keys from the environment. Import this
 * module from route handlers and server components only — never from a
 * "use client" file, or the keys would be bundled for the browser (§64).
 */

import { GoogleGeocodingProvider } from "./google-geocoding";
import { GoogleSolarProvider } from "./google-solar";
import { PVWattsProvider } from "./pvwatts";
import { PVGISProvider } from "./pvgis";
import { OpenEIUtilityRateProvider } from "./openei";
import { ConfiguredIncentiveProvider } from "./configured-incentives";
import type {
  GeocodingProvider,
  SolarGeospatialProvider,
  ProductionModelProvider,
  UtilityRateProvider,
  IncentiveProvider,
  ProviderAvailability,
} from "./types";
import {
  solarGeospatialEnabled,
  solarPvwattsEnabled,
  solarPvgisEnabled,
  solarUtilityRatesEnabled,
  solarIncentivesEnabled,
} from "@/lib/feature-flags";

// Adapters are stateless; a module-level instance avoids re-reading env per call.
let geocoding: GeocodingProvider | null = null;
let geospatial: SolarGeospatialProvider | null = null;
let production: ProductionModelProvider | null = null;
let pvgis: ProductionModelProvider | null = null;
let utilityRates: UtilityRateProvider | null = null;
let incentives: IncentiveProvider | null = null;

export function getGeocodingProvider(): GeocodingProvider {
  return (geocoding ??= new GoogleGeocodingProvider());
}

/** null when the geospatial capability is switched off — callers use manual roof mode. */
export function getGeospatialProvider(): SolarGeospatialProvider | null {
  if (!solarGeospatialEnabled()) return null;
  return (geospatial ??= new GoogleSolarProvider());
}

/**
 * The independent second production model.
 *
 * Prefers PVWatts when an NREL key is configured, otherwise falls back to
 * PVGIS, which needs no credential. The two-model cross-check is a core
 * accuracy feature, so the default must be something that actually runs —
 * gating it behind a signup meant most deployments would silently produce
 * SINGLE_MODEL results.
 */
export function getProductionModelProvider(): ProductionModelProvider | null {
  if (solarPvwattsEnabled() && process.env.NREL_API_KEY?.trim()) {
    return (production ??= new PVWattsProvider());
  }
  if (solarPvgisEnabled()) {
    return (pvgis ??= new PVGISProvider());
  }
  return null;
}

export function getUtilityRateProvider(): UtilityRateProvider | null {
  if (!solarUtilityRatesEnabled()) return null;
  return (utilityRates ??= new OpenEIUtilityRateProvider());
}

export function getIncentiveProvider(): IncentiveProvider | null {
  if (!solarIncentivesEnabled()) return null;
  return (incentives ??= new ConfiguredIncentiveProvider());
}

/** Everything the methodology page and admin need to state what is actually live. */
export function providerAvailabilityReport(): ProviderAvailability[] {
  const report: ProviderAvailability[] = [getGeocodingProvider().availability];

  const push = (p: { availability: ProviderAvailability } | null, id: string, label: string, offReason: string) => {
    report.push(p ? p.availability : { id, label, configured: false, reason: offReason });
  };

  push(getGeospatialProvider(), "google-solar", "Google Solar API (Building Insights)", "Disabled by feature flag");
  push(
    getProductionModelProvider(),
    "second-production-model",
    "Independent production model (PVGIS / PVWatts)",
    "Disabled by feature flag",
  );
  push(getUtilityRateProvider(), "openei-urdb", "OpenEI Utility Rate Database", "Disabled by feature flag");
  push(
    getIncentiveProvider(),
    "renovessa-verified-incentives",
    "Renovessa reviewed incentive register",
    "Disabled by feature flag",
  );

  return report;
}

export type { ProviderAvailability } from "./types";
