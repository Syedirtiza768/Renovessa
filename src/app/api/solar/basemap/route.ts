import { NextRequest, NextResponse } from "next/server";
import { latLngSchema } from "@/lib/solar/schemas";
import { z } from "zod";
import { checkSolarRateLimit } from "@/lib/solar/rate-limit";
import { solarPlannerUsable, solarImageryEnabled } from "@/lib/feature-flags";
import { chooseBasemap } from "@/lib/solar/imagery";

/**
 * Satellite basemap proxy.
 *
 * The image is fetched server-side and streamed back so the Maps API key never
 * reaches the browser (§64) — a key embedded in an <img> src would be
 * scrapeable from any page source and billable by anyone.
 *
 * Responses are cached: the same roof is requested repeatedly as the homeowner
 * moves through the planner, and aerial imagery for a building does not change
 * between page loads. This is a transient HTTP cache, not persistence of
 * licensed imagery.
 */

const requestSchema = z.object({
  location: latLngSchema,
  widthMeters: z.number().finite().min(10).max(400),
  heightMeters: z.number().finite().min(10).max(400),
});

/** Matches the roof-analysis cadence: one basemap per analysed building. */
const CACHE_SECONDS = 60 * 60 * 6;

export async function GET(req: NextRequest) {
  if (!solarPlannerUsable() || !solarImageryEnabled()) {
    return NextResponse.json({ error: "Imagery is not enabled." }, { status: 404 });
  }
  const limited = checkSolarRateLimit(req, "roofAnalysis");
  if (limited) return limited;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Imagery is not configured." }, { status: 404 });
  }

  const params = req.nextUrl.searchParams;
  const parsed = requestSchema.safeParse({
    location: {
      latitude: Number(params.get("lat")),
      longitude: Number(params.get("lng")),
    },
    widthMeters: Number(params.get("w")),
    heightMeters: Number(params.get("h")),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid basemap request." }, { status: 400 });
  }

  const { location, widthMeters, heightMeters } = parsed.data;
  const basemap = chooseBasemap(location, widthMeters, heightMeters);

  const url =
    `https://maps.googleapis.com/maps/api/staticmap?` +
    new URLSearchParams({
      center: `${location.latitude},${location.longitude}`,
      zoom: String(basemap.zoom),
      size: `${basemap.widthPx}x${basemap.heightPx}`,
      scale: String(basemap.scale),
      maptype: "satellite",
      format: "png",
      key: apiKey,
    }).toString();

  try {
    const upstream = await fetch(url, { cache: "no-store" });
    if (!upstream.ok) {
      // A missing basemap is not fatal — the visualizer falls back to the
      // geometric view, which carries the same numbers.
      return NextResponse.json({ error: "Imagery unavailable." }, { status: 502 });
    }
    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "image/png",
        "Cache-Control": `private, max-age=${CACHE_SECONDS}`,
        // Ground resolution so the client can size its overlay to match.
        "X-Basemap-Meters-Per-Pixel": String(basemap.metersPerPixel),
        "X-Basemap-Width-Meters": String(basemap.widthMeters),
        "X-Basemap-Height-Meters": String(basemap.heightMeters),
        "X-Basemap-Zoom": String(basemap.zoom),
      },
    });
  } catch {
    return NextResponse.json({ error: "Imagery unavailable." }, { status: 502 });
  }
}
