import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { bathroomRockvilleEnabled } from "@/lib/feature-flags";
import { PublicPage, InfoCard, PageCta } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Walk-In Showers in Rockville, MD",
  description:
    "Plan a walk-in or curbless shower in Rockville. Custom tiled showers, glass enclosures, benches, niches, and accessibility features.",
  path: "/bathroom-remodeling/rockville-md/walk-in-showers",
});

export default function WalkInShowersPage() {
  if (!bathroomRockvilleEnabled()) notFound();
  return (
    <PublicPage
      eyebrow="Walk-in showers · Rockville, MD"
      title="Walk-in showers in Rockville."
      intro="A walk-in or curbless shower is a popular upgrade for accessibility and modern design. The planner captures the shower type, waterproofing scope, and finish tier."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Bathroom Remodeling", href: "/bathroom-remodeling/rockville-md" }, { label: "Walk-In Showers" }]}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <InfoCard title="Curbless shower considerations">
          <ul className="list-disc space-y-1 pl-5">
            <li>Floor recessing and drainage modifications</li>
            <li>Linear or trench drain</li>
            <li>Waterproofing system selection</li>
            <li>Structural review by contractor or design professional</li>
          </ul>
        </InfoCard>
        <InfoCard title="Illustrative range">
          <p>$9,000 – $22,000 for a custom tiled walk-in shower in Rockville. Curbless showers add a structural allowance.</p>
        </InfoCard>
      </div>
      <PageCta title="Plan your walk-in shower" label="Start the planner" href="/bathroom-remodeling/rockville-md/planner" />
    </PublicPage>
  );
}
