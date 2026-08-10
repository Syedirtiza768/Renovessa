/**
 * Incentive provider backed by Renovessa's own reviewed program table (§26–28).
 *
 * Renovessa does not currently hold a DSIRE commercial licence, and §27
 * forbids hard-coding federal tax assumptions. So the only source of truth is
 * `SolarIncentiveProgram` — rows an admin entered with a source URL, effective
 * dates, and a `lastVerifiedAt` stamp.
 *
 * **An empty table is a correct result.** It renders as "incentive information
 * could not currently be verified and has been excluded from this estimate",
 * never as "there are no incentives".
 *
 * A `DsireIncentiveProvider` can be added alongside this one later without
 * changing any caller — that is the point of the interface.
 */

import { prisma } from "@/lib/db";
import type { IncentiveProvider, IncentiveLookupContext, ProviderAvailability } from "./types";
import type { IncentiveProgram, IncentiveApplicability, IncentiveValueType } from "../types";

/** Programs not re-verified within this window are withheld rather than shown stale (§50). */
export const INCENTIVE_STALE_AFTER_DAYS = Number(process.env.SOLAR_INCENTIVE_STALE_DAYS || 180);

function daysSince(iso: Date): number {
  return (Date.now() - iso.getTime()) / 86_400_000;
}

export class ConfiguredIncentiveProvider implements IncentiveProvider {
  get availability(): ProviderAvailability {
    return {
      id: "renovessa-verified-incentives",
      label: "Renovessa reviewed incentive register",
      configured: true,
    };
  }

  async findIncentives(
    ctx: IncentiveLookupContext,
  ): Promise<{ ok: true; programs: IncentiveProgram[] } | { ok: false; reason: string; message: string }> {
    const now = new Date();

    let rows;
    try {
      rows = await prisma.solarIncentiveProgram.findMany({
        where: {
          status: "PUBLISHED",
          AND: [
            { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }] },
            { OR: [{ expiresOn: null }, { expiresOn: { gte: now } }] },
          ],
        },
        orderBy: [{ jurisdictionLevel: "asc" }, { name: "asc" }],
      });
    } catch (e) {
      // A DB failure must not fabricate incentives, and must not break results.
      console.error("solar incentive lookup failed", e);
      return {
        ok: false,
        reason: "LOOKUP_FAILED",
        message: "Incentive information could not currently be verified and has been excluded from this estimate.",
      };
    }

    const state = ctx.state?.toUpperCase();

    const programs: IncentiveProgram[] = rows
      // Jurisdiction filter: federal always applies; state/local only when the
      // project is actually in that jurisdiction. An unmatched row is dropped,
      // never "applied anyway".
      .filter((r) => {
        if (r.jurisdictionLevel === "FEDERAL") return true;
        if (!state) return false;
        return (r.stateCode ?? "").toUpperCase() === state;
      })
      // Withhold anything whose verification has gone stale.
      .filter((r) => daysSince(r.lastVerifiedAt) <= INCENTIVE_STALE_AFTER_DAYS)
      .map((r) => ({
        id: r.id,
        name: r.name,
        jurisdiction: r.jurisdiction,
        administrator: r.administrator ?? undefined,
        technology: r.technology,
        incentiveType: r.incentiveType,
        valueType: r.valueType as IncentiveValueType,
        value: r.value ?? undefined,
        maximumAmount: r.maximumAmount ?? undefined,
        eligibilitySummary: r.eligibilitySummary,
        effectiveFrom: r.effectiveFrom?.toISOString().slice(0, 10),
        expiresOn: r.expiresOn?.toISOString().slice(0, 10),
        sourceName: r.sourceName,
        sourceUrl: r.sourceUrl,
        lastVerifiedAt: r.lastVerifiedAt.toISOString().slice(0, 10),
        verifiedBy: r.verifiedBy ?? undefined,
        applicability: r.applicability as IncentiveApplicability,
        homeownerRequirements: Array.isArray(r.homeownerRequirements)
          ? (r.homeownerRequirements as string[])
          : [],
      }));

    return { ok: true, programs };
  }
}
