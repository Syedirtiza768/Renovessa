import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { bathroomRockvilleEnabled, bathroomLandingEnabled } from "@/lib/feature-flags";

const routes = [
  "/",
  "/estimate",
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

export default function sitemap(): MetadataRoute.Sitemap {
  let allRoutes = [...routes];
  if (bathroomRockvilleEnabled()) allRoutes = [...allRoutes, ...bathroomRoutes];
  if (bathroomLandingEnabled()) allRoutes = [...allRoutes, ...genericBathroomRoutes];
  return allRoutes.map((route) => ({
    url: absoluteUrl(route),
    lastModified: new Date("2026-07-26"),
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority:
      route === "/"
        ? 1
        : route === "/estimate"
        ? 0.9
        : route.startsWith("/bathroom-remodeling")
        ? 0.85
        : 0.7,
  }));
}
