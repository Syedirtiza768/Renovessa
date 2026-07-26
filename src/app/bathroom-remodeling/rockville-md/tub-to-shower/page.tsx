import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { bathroomRockvilleEnabled } from "@/lib/feature-flags";
import { PublicPage, InfoCard, PageCta } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Tub-to-Shower Conversions in Rockville, MD",
  description:
    "Plan a tub-to-shower conversion in Rockville. Remove an alcove tub, add a custom tiled or curbless shower, and get a localized planning range.",
  path: "/bathroom-remodeling/rockville-md/tub-to-shower",
});

export default function TubToShowerPage() {
  if (!bathroomRockvilleEnabled()) notFound();
  return (
    <PublicPage
      eyebrow="Tub-to-shower · Rockville, MD"
      title="Tub-to-shower conversions in Rockville."
      intro="Removing an alcove tub and adding a walk-in or curbless shower is one of the most common Rockville bathroom remodels. The planner captures the scope and produces a planning range."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Bathroom Remodeling", href: "/bathroom-remodeling/rockville-md" }, { label: "Tub-to-Shower" }]}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <InfoCard title="What changes the cost">
          <ul className="list-disc space-y-1 pl-5">
            <li>Shower type (curbed vs. curbless)</li>
            <li>Drain relocation distance</li>
            <li>Tile coverage and complexity</li>
            <li>Glass enclosure style</li>
            <li>Shower bench, niche, handheld, and rain shower</li>
          </ul>
        </InfoCard>
        <InfoCard title="Illustrative range">
          <p>$7,000 – $18,000 for a typical alcove-tub-to-shower conversion in Rockville, depending on finishes and plumbing relocation.</p>
        </InfoCard>
      </div>
      <PageCta title="Plan your tub-to-shower conversion" label="Start the planner" href="/bathroom-remodeling/rockville-md/planner" />
    </PublicPage>
  );
}
