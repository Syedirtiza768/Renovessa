import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { solarLandingEnabled, solarFlagSnapshot } from "@/lib/feature-flags";
import { SolarLandingPage } from "@/components/solar/SolarLandingPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  // No "| Renovessa" suffix: the root layout applies template "%s | Renovessa".
  title: "Residential Solar Planner — See Panels on Your Roof",
  description:
    "Enter your address to explore your roof's solar potential, visualise panels on it, estimate production and cost, and prepare a project qualified installers can quote.",
  path: "/solar",
});

/**
 * Rendered per request rather than prerendered: the feature flags that gate
 * this page come from the container's runtime env, and a build-time snapshot
 * would freeze them into the image.
 */
export const dynamic = "force-dynamic";

export default function SolarPage() {
  if (!solarLandingEnabled()) notFound();
  return <SolarLandingPage flags={solarFlagSnapshot()} />;
}
