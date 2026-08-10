/**
 * Daily spend guard for metered geospatial calls (§64).
 *
 * `/solar/planner` is public and Google Solar Building Insights is billed per
 * request, so an abusive or buggy client could run up a real bill. The
 * in-app rate limiter (`rate-limit.ts`) is per-IP *and per container*, which
 * bounds one caller but not the aggregate — and not at all across a restart.
 *
 * This is the aggregate backstop: a hard daily ceiling on provider calls,
 * counted from the audit trail so it survives restarts and is shared across
 * every container.
 *
 * It complements, and does not replace, a quota cap set in the Google Cloud
 * console. That one is authoritative and enforced by the billing account
 * itself; this one degrades the product gracefully instead of returning
 * opaque provider errors to a homeowner.
 */

import { prisma } from "@/lib/db";

/**
 * Ceiling on billed roof analyses per UTC day. Sized for a marketing site,
 * not a mapping product — raise it deliberately when real traffic justifies it.
 */
export const DAILY_ROOF_ANALYSIS_CAP = Number(process.env.SOLAR_DAILY_ROOF_ANALYSIS_CAP || 250);

export interface BudgetStatus {
  allowed: boolean;
  used: number;
  cap: number;
  /** Seconds until the window resets, for a Retry-After header. */
  resetsInSeconds: number;
}

function startOfUtcDay(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function secondsUntilUtcMidnight(now = new Date()): number {
  const next = startOfUtcDay(now).getTime() + 86_400_000;
  return Math.max(1, Math.ceil((next - now.getTime()) / 1000));
}

/**
 * How many billable roof analyses have run today.
 *
 * Counts completed and failed attempts alike, because a provider call that
 * came back NOT_FOUND was still a call. Attempts that never reached the
 * provider (flag disabled, no API key) are also counted — they inflate the
 * number slightly, but only in configurations where no spend is possible, and
 * over-counting is the safe direction for a spend guard.
 */
export async function checkRoofAnalysisBudget(now = new Date()): Promise<BudgetStatus> {
  const cap = DAILY_ROOF_ANALYSIS_CAP;
  const resetsInSeconds = secondsUntilUtcMidnight(now);

  try {
    const used = await prisma.auditEvent.count({
      where: {
        eventType: { in: ["SOLAR_ROOF_ANALYSIS_COMPLETED", "SOLAR_ROOF_ANALYSIS_FAILED"] },
        createdAt: { gte: startOfUtcDay(now) },
      },
    });
    return { allowed: used < cap, used, cap, resetsInSeconds };
  } catch (e) {
    // A counting failure must not become a spend failure. Fail OPEN here:
    // the per-IP limiter and the Google-side quota are still in force, and
    // taking the planner down because an audit count failed would be a worse
    // outcome than one uncounted call.
    console.error("solar roof-analysis budget check failed", e);
    return { allowed: true, used: -1, cap, resetsInSeconds };
  }
}

/**
 * Homeowner-facing copy for an exhausted budget.
 *
 * Deliberately routes to manual roof entry rather than a dead end: the
 * homeowner can still complete a plan, and production is still modelled.
 */
export function budgetExceededFailure() {
  return {
    reason: "BUDGET_EXCEEDED" as const,
    message:
      "Automatic roof analysis has hit its daily limit. You can describe your roof and we'll still model production, or come back tomorrow for the aerial analysis.",
    recovery: "MANUAL_ROOF" as const,
    retryable: false,
  };
}
