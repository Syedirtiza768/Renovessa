/**
 * Google Geocoding API adapter.
 *
 * Server-side only — the key never reaches the browser (§64). Address
 * autocomplete in the planner posts to our own route, which calls this.
 */

import type { GeocodingProvider, GeocodeResult, ProviderAvailability } from "./types";
import type { NormalizedAddress } from "../types";
import { getJson, queryString } from "./http";

const ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";

/** Raw Google shapes — confined to this file. */
interface GoogleGeocodeResponse {
  status: string;
  error_message?: string;
  results?: Array<{
    formatted_address: string;
    place_id?: string;
    address_components?: Array<{ long_name: string; short_name: string; types: string[] }>;
    geometry?: {
      location?: { lat: number; lng: number };
      location_type?: string;
    };
  }>;
}

function component(
  components: GoogleGeocodeResponse["results"] extends Array<infer R>
    ? R extends { address_components?: infer C }
      ? C
      : never
    : never,
  type: string,
  form: "long" | "short" = "long",
): string | undefined {
  const list = (components ?? []) as Array<{ long_name: string; short_name: string; types: string[] }>;
  const hit = list.find((c) => c.types.includes(type));
  if (!hit) return undefined;
  return form === "short" ? hit.short_name : hit.long_name;
}

function mapQuality(locationType?: string): NormalizedAddress["locationQuality"] {
  switch (locationType) {
    case "ROOFTOP":
      return "ROOFTOP";
    case "RANGE_INTERPOLATED":
      return "RANGE_INTERPOLATED";
    case "GEOMETRIC_CENTER":
      return "GEOMETRIC_CENTER";
    case "APPROXIMATE":
      return "APPROXIMATE";
    default:
      return "UNKNOWN";
  }
}

export class GoogleGeocodingProvider implements GeocodingProvider {
  private readonly apiKey: string | undefined;

  constructor(apiKey = process.env.GOOGLE_MAPS_API_KEY) {
    this.apiKey = apiKey?.trim() || undefined;
  }

  get availability(): ProviderAvailability {
    return {
      id: "google-geocoding",
      label: "Google Geocoding API",
      configured: Boolean(this.apiKey),
      reason: this.apiKey ? undefined : "GOOGLE_MAPS_API_KEY is not set",
    };
  }

  async geocode(query: string, opts: { signal?: AbortSignal } = {}): Promise<GeocodeResult> {
    const trimmed = query.trim();
    if (trimmed.length < 4) {
      return { ok: false, reason: "INVALID_INPUT", message: "Enter a street address to continue." };
    }
    if (!this.apiKey) {
      return {
        ok: false,
        reason: "NOT_CONFIGURED",
        message: "Address lookup isn't available right now. You can enter your coordinates manually instead.",
      };
    }

    const url = `${ENDPOINT}?${queryString({
      address: trimmed,
      key: this.apiKey,
      // Bias to US addresses; Renovessa serves the DMV.
      components: "country:US",
    })}`;

    const res = await getJson<GoogleGeocodeResponse>(url, { signal: opts.signal });

    if (!res.ok) {
      return {
        ok: false,
        reason: "PROVIDER_UNAVAILABLE",
        message: "We couldn't look that address up just now. Try again, or enter your coordinates manually.",
      };
    }

    const body = res.data;
    if (body.status === "ZERO_RESULTS" || !body.results?.length) {
      return {
        ok: false,
        reason: "NO_RESULTS",
        message: "We couldn't find that address. Check the spelling, or enter your coordinates manually.",
      };
    }
    if (body.status !== "OK") {
      return {
        ok: false,
        reason: "PROVIDER_UNAVAILABLE",
        message: "Address lookup is temporarily unavailable. You can enter your coordinates manually instead.",
      };
    }

    const candidates: NormalizedAddress[] = body.results
      .filter((r) => r.geometry?.location)
      .slice(0, 5)
      .map((r) => {
        const comps = r.address_components;
        const streetNumber = component(comps as never, "street_number");
        const route = component(comps as never, "route");
        return {
          formatted: r.formatted_address,
          streetLine: [streetNumber, route].filter(Boolean).join(" ") || undefined,
          city:
            component(comps as never, "locality") ??
            component(comps as never, "sublocality") ??
            component(comps as never, "administrative_area_level_3"),
          state: component(comps as never, "administrative_area_level_1", "short"),
          county: component(comps as never, "administrative_area_level_2"),
          postalCode: component(comps as never, "postal_code"),
          country: component(comps as never, "country", "short"),
          location: {
            latitude: r.geometry!.location!.lat,
            longitude: r.geometry!.location!.lng,
          },
          locationQuality: mapQuality(r.geometry?.location_type),
          providerPlaceId: r.place_id,
        };
      });

    if (!candidates.length) {
      return { ok: false, reason: "NO_RESULTS", message: "That address didn't resolve to a location we can use." };
    }

    return { ok: true, candidates };
  }
}
