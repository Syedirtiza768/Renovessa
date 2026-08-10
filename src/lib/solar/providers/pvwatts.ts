/**
 * NREL PVWatts v8 adapter — Model B (§16).
 *
 * One request per roof segment, using that segment's own tilt and azimuth.
 * Averaging materially different roof planes into a single call is a real
 * accuracy loss and is explicitly not done here.
 *
 * PVWatts returns **AC** energy. Google's `yearlyEnergyDcKwh` is **DC**. The
 * reconciliation step converts before comparing; this adapter returns AC.
 */

import type { ProductionModelProvider, ProviderAvailability } from "./types";
import type { ProductionModelOutput, SegmentProductionInput } from "../types";
import { getJson, queryString } from "./http";

const ENDPOINT = "https://developer.nrel.gov/api/pvwatts/v8.json";

/** PVWatts' own default system losses. Used unless an admin config overrides. */
export const PVWATTS_DEFAULT_LOSSES_PERCENT = 14.08;

/** PVWatts rejects tilt < 0; near-flat roofs are modelled at a small tilt. */
export const MIN_MODELLED_TILT_DEGREES = 5;

interface PvWattsResponse {
  errors?: string[];
  warnings?: string[];
  outputs?: {
    ac_annual?: number;
    ac_monthly?: number[];
    solrad_annual?: number;
    capacity_factor?: number;
  };
}

export class PVWattsProvider implements ProductionModelProvider {
  private readonly apiKey: string | undefined;

  constructor(apiKey = process.env.NREL_API_KEY) {
    this.apiKey = apiKey?.trim() || undefined;
  }

  get availability(): ProviderAvailability {
    return {
      id: "pvwatts-v8",
      label: "NREL PVWatts v8",
      configured: Boolean(this.apiKey),
      reason: this.apiKey ? undefined : "NREL_API_KEY is not set",
    };
  }

  async modelProduction(
    segments: SegmentProductionInput[],
    opts: { systemLossesPercent?: number; signal?: AbortSignal } = {},
  ): Promise<{ ok: true; output: ProductionModelOutput } | { ok: false; message: string }> {
    if (!this.apiKey) {
      return { ok: false, message: "Independent production modelling isn't configured." };
    }
    const usable = segments.filter((s) => s.panelCount > 0 && s.capacityKw > 0);
    if (!usable.length) {
      return { ok: false, message: "No panels are selected, so there is nothing to model." };
    }

    const losses = opts.systemLossesPercent ?? PVWATTS_DEFAULT_LOSSES_PERCENT;
    const notes: string[] = [];
    const monthly = new Array(12).fill(0);
    const bySegment: Array<{ segmentIndex: number; annualAcKwh: number }> = [];
    let annual = 0;

    // Segments are independent; run them concurrently but bound the fan-out so
    // a many-plane roof cannot burst the NREL rate limit.
    const results = await runWithConcurrency(usable, 4, async (segment) => {
      const tilt = Math.max(MIN_MODELLED_TILT_DEGREES, segment.tiltDegrees);
      const url = `${ENDPOINT}?${queryString({
        api_key: this.apiKey,
        lat: segment.location.latitude,
        lon: segment.location.longitude,
        system_capacity: round(segment.capacityKw, 4),
        azimuth: normalizeAzimuth(segment.azimuthDegrees),
        tilt: round(tilt, 2),
        array_type: 1, // fixed roof mount
        module_type: 0, // standard
        losses: round(losses, 2),
        timeframe: "monthly",
      })}`;
      const res = await getJson<PvWattsResponse>(url, { signal: opts.signal });
      return { segment, res, tiltUsed: tilt };
    });

    for (const { segment, res, tiltUsed } of results) {
      if (!res.ok) {
        return {
          ok: false,
          message: "The independent production model didn't respond for every roof face.",
        };
      }
      if (res.data.errors?.length) {
        return { ok: false, message: "The independent production model rejected the roof inputs." };
      }
      const out = res.data.outputs;
      if (typeof out?.ac_annual !== "number") {
        return { ok: false, message: "The independent production model returned no usable output." };
      }

      annual += out.ac_annual;
      bySegment.push({ segmentIndex: segment.segmentIndex, annualAcKwh: out.ac_annual });

      if (Array.isArray(out.ac_monthly) && out.ac_monthly.length === 12) {
        for (let i = 0; i < 12; i++) monthly[i] += out.ac_monthly[i];
      }

      if (tiltUsed !== segment.tiltDegrees) {
        notes.push(
          `Roof face ${segment.segmentIndex + 1} is nearly flat (${round(segment.tiltDegrees, 1)}°); it was modelled at ${MIN_MODELLED_TILT_DEGREES}° tilt.`,
        );
      }
    }

    const anyMonthly = monthly.some((m) => m > 0);

    return {
      ok: true,
      output: {
        modelId: "PVWATTS_V8",
        annualAcKwh: annual,
        monthlyAcKwh: anyMonthly ? monthly : [],
        bySegment,
        notes: [
          `Modelled ${usable.length} roof face${usable.length === 1 ? "" : "s"} separately at ${round(losses, 2)}% system losses.`,
          ...notes,
        ],
      },
    };
  }
}

/** PVWatts expects 0–359 with 180 = south. Google azimuth uses the same convention. */
export function normalizeAzimuth(azimuthDegrees: number): number {
  const a = azimuthDegrees % 360;
  return round(a < 0 ? a + 360 : a, 2);
}

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Small bounded-concurrency map so we do not need a dependency for it. */
async function runWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}
