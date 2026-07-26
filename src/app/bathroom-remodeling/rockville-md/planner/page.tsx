import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { bathroomPlannerUsable, bathroomFlagSnapshot } from "@/lib/feature-flags";
import { BathroomPlanner } from "@/components/bathroom/BathroomPlanner";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Bathroom Remodeling Planner for Rockville, MD",
  description:
    "Plan your Rockville bathroom remodel step by step. Measurements, layout, fixtures, finishes, conditions, estimate, permits, and a contractor-ready brief.",
  path: "/bathroom-remodeling/rockville-md/planner",
  noIndex: true,
});

export default function PlannerPage() {
  if (!bathroomPlannerUsable()) notFound();
  const flags = bathroomFlagSnapshot();
  return <BathroomPlanner flags={flags} />;
}
