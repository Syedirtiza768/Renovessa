import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { bathroomRockvilleEnabled, bathroomFlagSnapshot } from "@/lib/feature-flags";
import { RockvilleBathroomPage } from "@/components/bathroom/RockvilleBathroomPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Bathroom Remodeling Planner for Rockville, MD Homeowners | Renovessa",
  description:
    "Plan your Rockville bathroom remodel before requesting contractor bids. Measure, explore layouts, select materials, see a localized planning range, and create a contractor-ready brief.",
  path: "/bathroom-remodeling/rockville-md",
});

export default function Page() {
  if (!bathroomRockvilleEnabled()) notFound();
  const flags = bathroomFlagSnapshot();
  return <RockvilleBathroomPage flags={flags} />;
}
