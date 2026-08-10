/**
 * OpenEI Utility Rate Database (URDB) adapter (§21).
 *
 * URDB coverage is uneven and entries can be years stale. This adapter
 * therefore returns *every* plausible residential tariff and marks each with
 * its effective date and retrieval time. It never nominates one as "the
 * homeowner's rate" — that is a homeowner confirmation, made in the planner.
 *
 * Tariffs with time-of-use or tiered structures are flagged
 * `hasComplexStructure` and are NOT reduced to a single blended rate here;
 * pretending a TOU tariff is a flat rate is exactly the kind of fake precision
 * the product forbids.
 */

import type { UtilityRateProvider, ProviderAvailability } from "./types";
import type { LatLng, NormalizedTariff } from "../types";
import { getJson, queryString } from "./http";

const ENDPOINT = "https://api.openei.org/utility_rates";

interface UrdbItem {
  label?: string;
  utility?: string;
  name?: string;
  sector?: string;
  startdate?: number | string;
  uri?: string;
  fixedchargefirstmeter?: number;
  fixedchargeunits?: string;
  /** [period][tier] -> { rate, adj?, unit? } */
  energyratestructure?: Array<Array<{ rate?: number; adj?: number; unit?: string }>>;
  /** 12 x 24 schedules. More than one distinct period => time-of-use. */
  energyweekdayschedule?: number[][];
  energyweekendschedule?: number[][];
}

interface UrdbResponse {
  items?: UrdbItem[];
  error?: { code?: string; message?: string };
}

/**
 * Reduce a URDB energy structure to a single $/kWh only when it is genuinely
 * flat: one period, one tier. Returns undefined otherwise.
 */
export function flatEnergyRate(item: UrdbItem): number | undefined {
  const structure = item.energyratestructure;
  if (!structure?.length) return undefined;
  if (structure.length !== 1) return undefined;
  const tiers = structure[0];
  if (!tiers?.length || tiers.length !== 1) return undefined;
  const tier = tiers[0];
  if (typeof tier.rate !== "number") return undefined;
  // `adj` is an adjustment added to the base rate in URDB's model.
  return tier.rate + (typeof tier.adj === "number" ? tier.adj : 0);
}

/** True when the tariff varies by hour/season/tier in a way a flat rate misrepresents. */
export function hasComplexStructure(item: UrdbItem): boolean {
  const structure = item.energyratestructure;
  if (!structure?.length) return true; // unknown structure is not "simple"
  if (structure.length > 1) return true;
  if ((structure[0]?.length ?? 0) > 1) return true;
  const distinctPeriods = new Set<number>();
  for (const sched of [item.energyweekdayschedule, item.energyweekendschedule]) {
    for (const row of sched ?? []) for (const p of row) distinctPeriods.add(p);
  }
  return distinctPeriods.size > 1;
}

function startDateIso(v: number | string | undefined): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return undefined;
  // URDB start dates are unix seconds.
  const d = new Date(n * 1000);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

export class OpenEIUtilityRateProvider implements UtilityRateProvider {
  private readonly apiKey: string | undefined;

  constructor(apiKey = process.env.OPENEI_API_KEY) {
    this.apiKey = apiKey?.trim() || undefined;
  }

  get availability(): ProviderAvailability {
    return {
      id: "openei-urdb",
      label: "OpenEI Utility Rate Database",
      configured: Boolean(this.apiKey),
      reason: this.apiKey ? undefined : "OPENEI_API_KEY is not set",
    };
  }

  async findTariffs(
    location: LatLng,
    opts: { signal?: AbortSignal; limit?: number } = {},
  ): Promise<{ ok: true; tariffs: NormalizedTariff[] } | { ok: false; reason: string; message: string }> {
    if (!this.apiKey) {
      return {
        ok: false,
        reason: "NOT_CONFIGURED",
        message: "Utility rate lookup isn't available. You can enter your average rate instead.",
      };
    }

    const url = `${ENDPOINT}?${queryString({
      version: "latest",
      format: "json",
      api_key: this.apiKey,
      lat: location.latitude,
      lon: location.longitude,
      sector: "Residential",
      detail: "full",
      approved: "true",
      is_default: "true",
      limit: opts.limit ?? 8,
    })}`;

    const res = await getJson<UrdbResponse>(url, { signal: opts.signal });
    if (!res.ok) {
      return {
        ok: false,
        reason: "PROVIDER_UNAVAILABLE",
        message: "We couldn't reach the utility rate database. You can enter your average rate instead.",
      };
    }
    if (res.data.error) {
      return {
        ok: false,
        reason: "PROVIDER_ERROR",
        message: "The utility rate database returned an error. You can enter your average rate instead.",
      };
    }

    const items = res.data.items ?? [];
    const tariffs: NormalizedTariff[] = items
      .filter((i) => i.label && i.utility)
      .map((i) => ({
        providerId: "openei-urdb",
        tariffId: i.label!,
        utilityName: i.utility!,
        tariffName: i.name ?? "Unnamed tariff",
        sector: i.sector ?? "Residential",
        effectiveDate: startDateIso(i.startdate),
        blendedEnergyRateDollarsPerKwh: flatEnergyRate(i),
        fixedMonthlyChargeDollars:
          typeof i.fixedchargefirstmeter === "number" && (i.fixedchargeunits ?? "").includes("month")
            ? i.fixedchargefirstmeter
            : undefined,
        hasComplexStructure: hasComplexStructure(i),
        sourceUri: i.uri,
        retrievedAt: res.retrievedAt,
        homeownerConfirmed: false,
      }));

    if (!tariffs.length) {
      return {
        ok: false,
        reason: "NO_MATCH",
        message:
          "We couldn't find a published rate plan for your location. You can enter your average electricity rate instead.",
      };
    }

    return { ok: true, tariffs };
  }
}
