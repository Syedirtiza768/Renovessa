/**
 * Rate limiting for solar endpoints (§64).
 *
 * Google Solar, geocoding and PVWatts are all metered. Without a limit the
 * planner is an open proxy for paid APIs. Follows the existing in-memory
 * pattern used by /api/advisor and /api/bathroom-projects; a shared store is a
 * Phase 2 item tracked in the implementation note (this is per-process, so it
 * limits per container rather than globally).
 */

import { NextRequest, NextResponse } from "next/server";

interface Bucket {
  windowMs: number;
  max: number;
}

/** Tighter limits on the endpoints that cost money per call. */
const BUCKETS: Record<string, Bucket> = {
  geocode: { windowMs: 5 * 60_000, max: 40 },
  roofAnalysis: { windowMs: 5 * 60_000, max: 15 },
  production: { windowMs: 5 * 60_000, max: 30 },
  utilityRates: { windowMs: 5 * 60_000, max: 20 },
  project: { windowMs: 5 * 60_000, max: 60 },
  plan: { windowMs: 5 * 60_000, max: 120 },
};

const hits = new Map<string, number[]>();

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/**
 * Returns a 429 response when the caller is over budget, or null to proceed.
 * Callers do `const limited = checkSolarRateLimit(req, "geocode"); if (limited) return limited;`
 */
export function checkSolarRateLimit(req: NextRequest, bucketName: keyof typeof BUCKETS | string): NextResponse | null {
  const bucket = BUCKETS[bucketName] ?? BUCKETS.project;
  const key = `${bucketName}:${clientIp(req)}`;
  const now = Date.now();

  const recent = (hits.get(key) ?? []).filter((t) => now - t < bucket.windowMs);
  recent.push(now);
  hits.set(key, recent);

  // Opportunistic cleanup so the map cannot grow without bound in a long-lived
  // process. Cheap: only runs on a small fraction of requests.
  if (hits.size > 5000 && Math.random() < 0.01) {
    for (const [k, times] of hits) {
      if (!times.some((t) => now - t < bucket.windowMs)) hits.delete(k);
    }
  }

  if (recent.length > bucket.max) {
    return NextResponse.json(
      { error: "You're going a little fast for us. Give it a moment and try again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(bucket.windowMs / 1000)) } },
    );
  }
  return null;
}
