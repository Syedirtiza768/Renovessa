import { NextRequest, NextResponse } from "next/server";
import { geocodeRequestSchema } from "@/lib/solar/schemas";
import { getGeocodingProvider } from "@/lib/solar/providers";
import { solarPlannerUsable } from "@/lib/feature-flags";
import { checkSolarRateLimit } from "@/lib/solar/rate-limit";

/**
 * Address → normalized candidates.
 *
 * Server-side proxy so the geocoding key never reaches the browser, and so we
 * can rate-limit — otherwise the planner becomes an open proxy for a paid API
 * (§64). Always returns every candidate; picking one is the homeowner's job.
 */
export async function POST(req: NextRequest) {
  if (!solarPlannerUsable()) {
    return NextResponse.json({ error: "The solar planner is not enabled." }, { status: 404 });
  }

  const limited = checkSolarRateLimit(req, "geocode");
  if (limited) return limited;

  try {
    const { query } = geocodeRequestSchema.parse(await req.json());
    const result = await getGeocodingProvider().geocode(query);

    if (!result.ok) {
      // A miss is an ordinary outcome with a defined recovery, not a 5xx.
      return NextResponse.json(
        {
          candidates: [],
          failure: { reason: result.reason, message: result.message },
          recovery: result.reason === "NO_RESULTS" ? "REENTER_ADDRESS" : "MANUAL_COORDINATES",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ candidates: result.candidates, failure: null });
  } catch (e: unknown) {
    if ((e as { name?: string })?.name === "ZodError") {
      return NextResponse.json({ error: "Enter a street address to continue." }, { status: 400 });
    }
    console.error("solar geocode POST", e);
    return NextResponse.json({ error: "Address lookup failed." }, { status: 500 });
  }
}
