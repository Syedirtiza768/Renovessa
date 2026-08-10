import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { solarPlannerUsable, solarFlagSnapshot } from "@/lib/feature-flags";
import { SolarPlanner } from "@/components/solar/SolarPlanner";
import { resolvePricingConfig } from "@/lib/solar/config-loader";
import { getProductionModelProvider } from "@/lib/solar/providers";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Solar Planner",
  description:
    "Plan a residential solar system: roof analysis, panel layout, production modelling, cost range and a contractor-ready project brief.",
  path: "/solar/planner",
  // Personal planning session — never indexed, matching the bathroom planner.
  noIndex: true,
});

/** Per request: feature flags and the active pricing configuration are runtime state. */
export const dynamic = "force-dynamic";

export default async function SolarPlannerPage() {
  if (!solarPlannerUsable()) notFound();
  const { config } = await resolvePricingConfig();
  // Resolve the second production model here rather than inferring it from a
  // flag in the client: PVWatts off does not mean no second model, since PVGIS
  // needs no credential and takes over.
  const secondModel = getProductionModelProvider();
  return (
    <SolarPlanner
      flags={solarFlagSnapshot()}
      imageryStaleYears={config.roof.imageryStaleYears}
      secondModelLabel={secondModel?.availability.label ?? null}
    />
  );
}
