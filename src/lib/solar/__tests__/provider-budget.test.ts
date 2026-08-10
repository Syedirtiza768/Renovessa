/**
 * Daily spend guard.
 *
 * The properties that matter: it stops calls at the cap, it resets on a UTC
 * day boundary, it fails OPEN when counting breaks (a broken audit count must
 * not take the planner down), and exhaustion routes to manual roof entry
 * rather than a dead end.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const count = vi.fn();
vi.mock("@/lib/db", () => ({ prisma: { auditEvent: { count: (...a: unknown[]) => count(...a) } } }));

import { checkRoofAnalysisBudget, budgetExceededFailure, DAILY_ROOF_ANALYSIS_CAP } from "../provider-budget";

beforeEach(() => {
  count.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("roof analysis daily budget", () => {
  it("allows calls below the cap", async () => {
    count.mockResolvedValue(10);
    const s = await checkRoofAnalysisBudget();
    expect(s.allowed).toBe(true);
    expect(s.used).toBe(10);
    expect(s.cap).toBe(DAILY_ROOF_ANALYSIS_CAP);
  });

  it("blocks once the cap is reached, not merely exceeded", async () => {
    count.mockResolvedValue(DAILY_ROOF_ANALYSIS_CAP);
    expect((await checkRoofAnalysisBudget()).allowed).toBe(false);

    count.mockResolvedValue(DAILY_ROOF_ANALYSIS_CAP - 1);
    expect((await checkRoofAnalysisBudget()).allowed).toBe(true);
  });

  it("counts only today's attempts, from UTC midnight", async () => {
    count.mockResolvedValue(0);
    const now = new Date("2026-08-10T13:45:00.000Z");
    await checkRoofAnalysisBudget(now);

    const where = count.mock.calls[0][0].where;
    expect(where.createdAt.gte.toISOString()).toBe("2026-08-10T00:00:00.000Z");
    expect(where.eventType.in).toContain("SOLAR_ROOF_ANALYSIS_COMPLETED");
    expect(where.eventType.in).toContain("SOLAR_ROOF_ANALYSIS_FAILED");
  });

  it("reports seconds remaining until the window resets", async () => {
    count.mockResolvedValue(0);
    const s = await checkRoofAnalysisBudget(new Date("2026-08-10T23:59:00.000Z"));
    expect(s.resetsInSeconds).toBe(60);

    const t = await checkRoofAnalysisBudget(new Date("2026-08-10T00:00:00.000Z"));
    expect(t.resetsInSeconds).toBe(86_400);
  });

  it("fails OPEN when counting throws", async () => {
    // A broken audit count must not take the planner offline — the per-IP
    // limiter and the provider-side quota are still in force.
    count.mockRejectedValue(new Error("db down"));
    const s = await checkRoofAnalysisBudget();
    expect(s.allowed).toBe(true);
    expect(s.used).toBe(-1);
  });

  it("exhaustion routes to manual roof entry, never a dead end", () => {
    const f = budgetExceededFailure();
    expect(f.recovery).toBe("MANUAL_ROOF");
    expect(f.retryable).toBe(false);
    // Copy must not leak billing/quota internals to a homeowner.
    expect(f.message).not.toMatch(/quota|billing|api key|google/i);
    expect(f.message).toMatch(/describe your roof/i);
  });
});
