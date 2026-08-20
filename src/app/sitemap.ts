import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { bathroomRockvilleEnabled, bathroomLandingEnabled, solarLandingEnabled } from "@/lib/feature-flags";
import { STANDARD_ESTIMATOR_IDS } from "@/lib/landing-data";
import { getAllPublishedContent, publicPathForContent } from "@/lib/content";

/**
 * Generated per request, not prerendered.
 *
 * This file's contents depend on feature flags, and Next evaluates a static
 * sitemap at build time — so a prerendered copy freezes whatever the env was
 * during `next build`. Renovessa builds one image and supplies env at
 * container start, which meant enabling a landing flag at runtime made the
 * page reachable but never added it to the sitemap.
 */
export const dynamic = "force-dynamic";

const routes = [
  "/",
  "/estimate",
  ...STANDARD_ESTIMATOR_IDS.map((trade) => `/estimate/${trade}`),
  "/how-it-works",
  "/for-homeowners",
  "/for-contractors",
  "/trust",
  "/services",
  "/services/hvac",
  "/locations",
  "/locations/northern-virginia",
  "/locations/northern-virginia/fairfax-county",
  "/cost-guides",
  "/resources",
  "/about",
  "/contact",
  "/methodology/estimate-methodology",
  "/methodology/contractor-verification-methodology",
  "/editorial-policy",
  "/privacy",
  "/terms",
  "/accessibility",
  "/tcpa",
];

const bathroomRoutes = [
  "/bathroom-remodeling/rockville-md",
  "/bathroom-remodeling/rockville-md/cost",
  "/bathroom-remodeling/rockville-md/permits",
  "/bathroom-remodeling/rockville-md/planning-guide",
  "/bathroom-remodeling/rockville-md/tub-to-shower",
  "/bathroom-remodeling/rockville-md/walk-in-showers",
  "/bathroom-remodeling/rockville-md/primary-bathrooms",
  "/bathroom-remodeling/rockville-md/small-bathrooms",
  "/bathroom-remodeling/rockville-md/accessible-bathrooms",
  "/bathroom-remodeling/rockville-md/contractors",
];

const genericBathroomRoutes = [
  "/bathroom-remodeling",
];

// The planner itself is intentionally absent: it is a private planning session
// and is served noindex. Location pages are added only where genuinely
// localized content exists — no mass-generated thin pages.
const solarRoutes = [
  "/solar",
  "/solar/methodology",
];

function routePriority(route: string): number {
  if (route === "/") return 1;
  if (route === "/estimate") return 0.9;
  if (route.startsWith("/bathroom-remodeling") || route.startsWith("/solar")) return 0.85;
  if (route.startsWith("/cost-guides/") || route.startsWith("/resources/")) return 0.8;
  return 0.7;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let allRoutes = [...routes];
  if (bathroomRockvilleEnabled()) allRoutes = [...allRoutes, ...bathroomRoutes];
  if (bathroomLandingEnabled()) allRoutes = [...allRoutes, ...genericBathroomRoutes];
  if (solarLandingEnabled()) allRoutes = [...allRoutes, ...solarRoutes];

  // Add published authority content routes
  try {
    const published = await getAllPublishedContent();
    const contentRoutes = published.map((c) => publicPathForContent(c.slug, c.title));
    allRoutes = [...allRoutes, ...contentRoutes];
  } catch {
    // If database is unavailable during build, skip content routes
  }

  return allRoutes.map((route) => ({
    url: absoluteUrl(route),
    lastModified: new Date(),
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: routePriority(route),
  }));
}
