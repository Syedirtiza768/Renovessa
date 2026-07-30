import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { bathroomLandingEnabled, bathroomFlagSnapshot } from "@/lib/feature-flags";
import { BathroomRemodelingPage } from "@/components/bathroom/BathroomRemodelingPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Bathroom Remodeling Planner | Renovessa",
  description:
    "Plan your bathroom remodel before requesting contractor bids. Measure, explore layouts, select materials, see a localized planning range, and create a contractor-ready brief.",
  path: "/bathroom-remodeling",
});

export default function Page() {
  if (!bathroomLandingEnabled()) notFound();
  const flags = bathroomFlagSnapshot();
  return <BathroomRemodelingPage flags={flags} />;
}
