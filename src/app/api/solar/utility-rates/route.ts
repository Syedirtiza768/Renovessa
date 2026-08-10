import { NextRequest, NextResponse } from "next/server";
import { latLngSchema } from "@/lib/solar/schemas";
import { getUtilityRateProvider } from "@/lib/solar/providers";
import { checkSolarRateLimit } from "@/lib/solar/rate-limit";
import { solarPlannerUsable } from "@/lib/feature-flags";

/**
 * Residential tariff candidates for a location.
 *
 * Returns every plausible match. The planner asks the homeowner to confirm
 * which one is theirs — the first result is never assumed to be correct (§21).
 * A no-match is a 200 with a defined fallback, not an error.
 */
export async function POST(req: NextRequest) {
  if (!solarPlannerUsable()) {
    return NextResponse.json({ error: "The solar planner is not enabled." }, { status: 404 });
  }
  const limited = checkSolarRateLimit(req, "utilityRates");
  if (limited) return limited;

  try {
    const location = latLngSchema.parse(await req.json());
    const provider = getUtilityRateProvider();

    if (!provider) {
      return NextResponse.json({
        tariffs: [],
        failure: {
          reason: "NOT_CONFIGURED",
          message: "Utility rate lookup isn't available. You can enter your average electricity rate instead.",
        },
        recovery: "MANUAL_RATE",
      });
    }

    const result = await provider.findTariffs(location);
    if (!result.ok) {
      return NextResponse.json({
        tariffs: [],
        failure: { reason: result.reason, message: result.message },
        recovery: "MANUAL_RATE",
      });
    }

    return NextResponse.json({ tariffs: result.tariffs, failure: null });
  } catch (e: unknown) {
    if ((e as { name?: string })?.name === "ZodError") {
      return NextResponse.json({ error: "A valid location is required." }, { status: 400 });
    }
    console.error("solar utility-rates POST", e);
    return NextResponse.json({ error: "Utility rate lookup failed." }, { status: 500 });
  }
}
