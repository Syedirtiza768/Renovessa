/**
 * Google Solar API adapter — buildingInsights:findClosest (§10).
 *
 * Translates the provider payload into `RoofAnalysis`. Nothing downstream sees
 * a Google field name. Values we do not receive are left `undefined` rather
 * than defaulted, so the confidence engine can see what is genuinely missing.
 *
 * Retention: the caller decides whether to persist `rawPayload`. When it does,
 * it must stamp `providerDataExpiresAt` (see SolarRoofAnalysis) so licensed
 * source data can be purged independently of Renovessa-derived project data.
 */

import type { SolarGeospatialProvider, ProviderAvailability } from "./types";
import type {
  LatLng,
  RoofLookupResult,
  RoofSegment,
  CandidatePanel,
  PanelSpecification,
  ImageryQuality,
  RoofAnalysis,
} from "../types";
import { getJson, queryString } from "./http";

const ENDPOINT = "https://solar.googleapis.com/v1/buildingInsights:findClosest";

// --- Raw provider shapes (confined to this file) ---------------------------

interface GDate {
  year?: number;
  month?: number;
  day?: number;
}
interface GLatLng {
  latitude?: number;
  longitude?: number;
}
interface GSegmentStats {
  areaMeters2?: number;
  sunshineQuantiles?: number[];
  groundAreaMeters2?: number;
}
interface GRoofSegment {
  pitchDegrees?: number;
  azimuthDegrees?: number;
  stats?: GSegmentStats;
  center?: GLatLng;
  boundingBox?: { sw?: GLatLng; ne?: GLatLng };
  planeHeightAtCenterMeters?: number;
}
interface GSolarPanel {
  center?: GLatLng;
  orientation?: string;
  yearlyEnergyDcKwh?: number;
  segmentIndex?: number;
}
interface GBuildingInsights {
  name?: string;
  center?: GLatLng;
  boundingBox?: { sw?: GLatLng; ne?: GLatLng };
  imageryDate?: GDate;
  imageryProcessedDate?: GDate;
  imageryQuality?: string;
  postalCode?: string;
  administrativeArea?: string;
  solarPotential?: {
    maxArrayPanelsCount?: number;
    maxArrayAreaMeters2?: number;
    maxSunshineHoursPerYear?: number;
    carbonOffsetFactorKgPerMwh?: number;
    panelCapacityWatts?: number;
    panelHeightMeters?: number;
    panelWidthMeters?: number;
    panelLifetimeYears?: number;
    wholeRoofStats?: GSegmentStats;
    roofSegmentStats?: GRoofSegment[];
    solarPanels?: GSolarPanel[];
  };
}

// --- Helpers ---------------------------------------------------------------

function isoDate(d?: GDate): string | undefined {
  if (!d?.year) return undefined;
  const m = String(d.month ?? 1).padStart(2, "0");
  const day = String(d.day ?? 1).padStart(2, "0");
  return `${d.year}-${m}-${day}`;
}

function latLng(p?: GLatLng): LatLng | undefined {
  if (typeof p?.latitude !== "number" || typeof p?.longitude !== "number") return undefined;
  return { latitude: p.latitude, longitude: p.longitude };
}

function mapImageryQuality(q?: string): ImageryQuality {
  return q === "HIGH" || q === "MEDIUM" || q === "LOW" ? q : "UNKNOWN";
}

/**
 * Median of the provider's sunshine distribution. The quantiles array is
 * ordered min→max, so the midpoint is the median. Returns undefined rather
 * than a guess when the array is missing or degenerate.
 */
export function medianOfQuantiles(quantiles?: number[]): number | undefined {
  if (!quantiles?.length) return undefined;
  const mid = Math.floor(quantiles.length / 2);
  if (quantiles.length % 2 === 1) return quantiles[mid];
  return (quantiles[mid - 1] + quantiles[mid]) / 2;
}

export class GoogleSolarProvider implements SolarGeospatialProvider {
  private readonly apiKey: string | undefined;
  /** Provider's own quality floor. HIGH-only would reject too many DMV homes. */
  private readonly requiredQuality: "HIGH" | "MEDIUM" | "LOW";

  constructor(
    apiKey = process.env.GOOGLE_MAPS_API_KEY,
    requiredQuality = (process.env.SOLAR_REQUIRED_IMAGERY_QUALITY as "HIGH" | "MEDIUM" | "LOW") || "LOW",
  ) {
    this.apiKey = apiKey?.trim() || undefined;
    this.requiredQuality = requiredQuality;
  }

  get availability(): ProviderAvailability {
    return {
      id: "google-solar",
      label: "Google Solar API (Building Insights)",
      configured: Boolean(this.apiKey),
      reason: this.apiKey ? undefined : "GOOGLE_MAPS_API_KEY is not set",
    };
  }

  async findBuilding(location: LatLng, opts: { signal?: AbortSignal } = {}): Promise<RoofLookupResult> {
    if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
      return {
        ok: false,
        reason: "INVALID_LOCATION",
        message: "That location isn't valid. Re-enter your address to continue.",
        recovery: "REENTER_ADDRESS",
        retryable: false,
      };
    }
    if (!this.apiKey) {
      return {
        ok: false,
        reason: "NOT_CONFIGURED",
        message:
          "Automatic roof analysis isn't available. You can describe your roof manually and we'll still model production.",
        recovery: "MANUAL_ROOF",
        retryable: false,
      };
    }

    const url = `${ENDPOINT}?${queryString({
      "location.latitude": location.latitude,
      "location.longitude": location.longitude,
      requiredQuality: this.requiredQuality,
      key: this.apiKey,
    })}`;

    const res = await getJson<GBuildingInsights>(url, { signal: opts.signal });

    if (!res.ok) {
      switch (res.kind) {
        case "NOT_FOUND":
          return {
            ok: false,
            reason: "NO_COVERAGE",
            message:
              "This property isn't in the solar imagery dataset yet. You can describe your roof manually and we'll still model production.",
            recovery: "MANUAL_ROOF",
            retryable: false,
          };
        case "TIMEOUT":
          return {
            ok: false,
            reason: "TIMEOUT",
            message: "Roof analysis took too long to respond. Try again, or describe your roof manually.",
            recovery: "RETRY",
            retryable: true,
          };
        case "RATE_LIMITED":
          return {
            ok: false,
            reason: "RATE_LIMITED",
            message: "Roof analysis is busy right now. Try again in a moment, or describe your roof manually.",
            recovery: "RETRY",
            retryable: true,
          };
        case "UNAUTHORIZED":
          return {
            ok: false,
            reason: "NOT_CONFIGURED",
            message:
              "Automatic roof analysis isn't available. You can describe your roof manually and we'll still model production.",
            recovery: "MANUAL_ROOF",
            retryable: false,
          };
        default:
          return {
            ok: false,
            reason: "PROVIDER_UNAVAILABLE",
            message: "Roof analysis is temporarily unavailable. Try again, or describe your roof manually.",
            recovery: "RETRY",
            retryable: true,
          };
      }
    }

    const analysis = this.normalize(res.data, res.retrievedAt);
    if (!analysis) {
      return {
        ok: false,
        reason: "BUILDING_NOT_FOUND",
        message:
          "We couldn't read a usable roof for this address. You can describe your roof manually and we'll still model production.",
        recovery: "MANUAL_ROOF",
        retryable: false,
      };
    }
    return { ok: true, analysis };
  }

  /** Exported shape-mapping, kept pure so contract tests can exercise it offline. */
  normalize(raw: GBuildingInsights, retrievedAt: string): RoofAnalysis | null {
    const center = latLng(raw.center);
    const potential = raw.solarPotential;
    if (!center || !potential) return null;

    // The panel specification must come from the provider — never assumed
    // (§14). Without it we cannot size a system honestly, so we bail to the
    // manual path rather than substituting a nominal wattage.
    const capacityWatts = potential.panelCapacityWatts;
    const heightMeters = potential.panelHeightMeters;
    const widthMeters = potential.panelWidthMeters;
    if (!capacityWatts || !heightMeters || !widthMeters) return null;

    const panelSpec: PanelSpecification = {
      capacityWatts,
      heightMeters,
      widthMeters,
      lifetimeYears: potential.panelLifetimeYears,
      source: "provider_layout_model",
    };

    const segments: RoofSegment[] = (potential.roofSegmentStats ?? []).flatMap((s, index) => {
      const segCenter = latLng(s.center);
      const sw = latLng(s.boundingBox?.sw);
      const ne = latLng(s.boundingBox?.ne);
      if (!segCenter || !sw || !ne) return [];
      if (typeof s.pitchDegrees !== "number" || typeof s.azimuthDegrees !== "number") return [];
      return [
        {
          index,
          pitchDegrees: s.pitchDegrees,
          azimuthDegrees: s.azimuthDegrees,
          areaMeters2: s.stats?.areaMeters2 ?? 0,
          groundAreaMeters2: s.stats?.groundAreaMeters2,
          center: segCenter,
          boundingBox: { sw, ne },
          sunshineQuantiles: s.stats?.sunshineQuantiles,
          medianSunshineHours: medianOfQuantiles(s.stats?.sunshineQuantiles),
          planeHeightAtCenterMeters: s.planeHeightAtCenterMeters,
        },
      ];
    });

    const knownSegments = new Set(segments.map((s) => s.index));

    const candidatePanels: CandidatePanel[] = (potential.solarPanels ?? []).flatMap((p, i) => {
      const c = latLng(p.center);
      // A panel whose segment we could not normalize cannot be modelled per
      // segment, so it is dropped rather than attached to a guessed plane.
      if (!c || typeof p.segmentIndex !== "number" || !knownSegments.has(p.segmentIndex)) return [];
      return [
        {
          id: `${p.segmentIndex}:${i}`,
          segmentIndex: p.segmentIndex,
          center: c,
          orientation: p.orientation === "PORTRAIT" ? "PORTRAIT" : "LANDSCAPE",
          yearlyEnergyDcKwh: p.yearlyEnergyDcKwh ?? 0,
        },
      ];
    });

    return {
      providerId: "google-solar",
      isManual: false,
      buildingCenter: center,
      boundingBox:
        latLng(raw.boundingBox?.sw) && latLng(raw.boundingBox?.ne)
          ? { sw: latLng(raw.boundingBox?.sw)!, ne: latLng(raw.boundingBox?.ne)! }
          : undefined,
      imageryDate: isoDate(raw.imageryDate),
      imageryProcessedDate: isoDate(raw.imageryProcessedDate),
      imageryQuality: mapImageryQuality(raw.imageryQuality),
      segments,
      candidatePanels,
      panelSpec,
      // Trust the provider's own maximum, but never exceed the positions it
      // actually gave us — the layout engine can only select real candidates.
      maxPanelCount: Math.min(potential.maxArrayPanelsCount ?? candidatePanels.length, candidatePanels.length),
      maxArrayAreaMeters2: potential.maxArrayAreaMeters2,
      maxSunshineHoursPerYear: potential.maxSunshineHoursPerYear,
      wholeRoofAreaMeters2: potential.wholeRoofStats?.areaMeters2,
      carbonOffsetFactorKgPerMwh: potential.carbonOffsetFactorKgPerMwh,
      retrievedAt,
      postalCode: raw.postalCode,
      administrativeArea: raw.administrativeArea,
    };
  }
}
