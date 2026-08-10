/**
 * PVGIS v5.2 adapter (European Commission Joint Research Centre) — Model B.
 *
 * A key-free alternative to NREL PVWatts, and the default second production
 * model because it needs no signup, no API key and no quota. That matters:
 * the two-model cross-check is a core accuracy feature, and gating it behind
 * a credential meant most deployments would silently run single-model.
 *
 * For the Americas PVGIS serves **PVGIS-NSRDB** — NREL's own National Solar
 * Radiation Database, the same radiation source family PVWatts uses — so this
 * is a genuine independent model rather than a rough substitute. It also
 * applies terrain horizon shading, which PVWatts does not do by default.
 *
 * As with PVWatts, each roof segment is modelled separately with its own tilt
 * and azimuth and the results are aggregated (§16). PVGIS returns AC energy.
 */

import type { ProductionModelProvider, ProviderAvailability } from "./types";
import type { ProductionModelOutput, SegmentProductionInput } from "../types";
import { getJson, queryString } from "./http";

const ENDPOINT = "https://re.jrc.ec.europa.eu/api/v5_2/PVcalc";

/** PVGIS rejects tilt outside 0–90; near-flat roofs get a small modelling tilt. */
export const MIN_MODELLED_TILT_DEGREES = 5;

interface PvgisResponse {
  inputs?: {
    meteo_data?: { radiation_db?: string; use_horizon?: boolean };
  };
  outputs?: {
    totals?: { fixed?: { E_y?: number } };
    monthly?: { fixed?: Array<{ month?: number; E_m?: number }> };
  };
  message?: string;
  status?: number;
}

/**
 * Convert a compass azimuth (0 = north, 180 = south — the Google/PVWatts
 * convention) into PVGIS `aspect` (0 = south, -90 = east, +90 = west).
 *
 * Getting this wrong would silently model a south roof as facing north, so it
 * is isolated here and unit-tested.
 */
export function toPvgisAspect(azimuthDegrees: number): number {
  let aspect = (azimuthDegrees % 360) - 180;
  // Normalise into (-180, 180].
  if (aspect <= -180) aspect += 360;
  if (aspect > 180) aspect -= 360;
  return round(aspect, 2);
}

export class PVGISProvider implements ProductionModelProvider {
  get availability(): ProviderAvailability {
    return {
      id: "pvgis-v5.2",
      label: "PVGIS v5.2 (EU Joint Research Centre)",
      // No credential to check — this is the point of choosing it.
      configured: true,
    };
  }

  async modelProduction(
    segments: SegmentProductionInput[],
    opts: { systemLossesPercent?: number; signal?: AbortSignal } = {},
  ): Promise<{ ok: true; output: ProductionModelOutput } | { ok: false; message: string }> {
    const usable = segments.filter((s) => s.panelCount > 0 && s.capacityKw > 0);
    if (!usable.length) {
      return { ok: false, message: "No panels are selected, so there is nothing to model." };
    }

    const losses = opts.systemLossesPercent ?? 14;
    const notes: string[] = [];
    const monthly = new Array(12).fill(0);
    const bySegment: Array<{ segmentIndex: number; annualAcKwh: number }> = [];
    let annual = 0;
    let radiationDb: string | undefined;
    let horizonUsed = false;

    const results = await runWithConcurrency(usable, 3, async (segment) => {
      const tilt = Math.max(MIN_MODELLED_TILT_DEGREES, Math.min(90, segment.tiltDegrees));
      const url = `${ENDPOINT}?${queryString({
        lat: round(segment.location.latitude, 6),
        lon: round(segment.location.longitude, 6),
        peakpower: round(segment.capacityKw, 4),
        loss: round(losses, 2),
        angle: round(tilt, 2),
        aspect: toPvgisAspect(segment.azimuthDegrees),
        pvtechchoice: "crystSi",
        // Roof-mounted modules run hotter than free-standing racks.
        mountingplace: "building",
        outputformat: "json",
      })}`;
      const res = await getJson<PvgisResponse>(url, { signal: opts.signal });
      return { segment, res, tiltUsed: tilt };
    });

    for (const { segment, res, tiltUsed } of results) {
      if (!res.ok) {
        return { ok: false, message: "The independent production model didn't respond for every roof face." };
      }
      const body = res.data;
      const annualForSegment = body.outputs?.totals?.fixed?.E_y;
      if (typeof annualForSegment !== "number") {
        return {
          ok: false,
          message: body.message
            ? "The independent production model rejected the roof inputs."
            : "The independent production model returned no usable output.",
        };
      }

      annual += annualForSegment;
      bySegment.push({ segmentIndex: segment.segmentIndex, annualAcKwh: annualForSegment });

      const months = body.outputs?.monthly?.fixed;
      if (Array.isArray(months) && months.length === 12) {
        for (const m of months) {
          const idx = (m.month ?? 0) - 1;
          if (idx >= 0 && idx < 12 && typeof m.E_m === "number") monthly[idx] += m.E_m;
        }
      }

      radiationDb ??= body.inputs?.meteo_data?.radiation_db;
      horizonUsed = horizonUsed || Boolean(body.inputs?.meteo_data?.use_horizon);

      if (tiltUsed !== segment.tiltDegrees) {
        notes.push(
          `Roof face ${segment.segmentIndex + 1} is nearly flat (${round(segment.tiltDegrees, 1)}°); it was modelled at ${MIN_MODELLED_TILT_DEGREES}° tilt.`,
        );
      }
    }

    return {
      ok: true,
      output: {
        modelId: "PVGIS_V52",
        annualAcKwh: annual,
        monthlyAcKwh: monthly.some((m) => m > 0) ? monthly : [],
        bySegment,
        notes: [
          `Modelled ${usable.length} roof face${usable.length === 1 ? "" : "s"} separately at ${round(losses, 2)}% system losses${radiationDb ? ` using ${radiationDb} radiation data` : ""}.`,
          ...(horizonUsed ? ["Terrain horizon shading was included."] : []),
          ...notes,
        ],
      },
    };
  }
}

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Bounded-concurrency map; PVGIS is a shared public service, so keep it modest. */
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
