import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

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

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: absoluteUrl(route),
    lastModified: new Date("2026-07-23"),
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : route === "/estimate" ? 0.9 : 0.7,
  }));
}
