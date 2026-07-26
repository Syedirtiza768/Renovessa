import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { bathroomRockvilleEnabled } from "@/lib/feature-flags";
import { PublicPage, InfoCard, PageCta } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Small Bathroom Remodels in Rockville, MD",
  description:
    "Plan a small bathroom or powder-room remodel in Rockville. Smart layouts, stock vanities, and targeted tile to maximize value.",
  path: "/bathroom-remodeling/rockville-md/small-bathrooms",
});

export default function SmallBathroomsPage() {
  if (!bathroomRockvilleEnabled()) notFound();
  return (
    <PublicPage
      eyebrow="Small bathrooms · Rockville, MD"
      title="Small bathroom remodels in Rockville."
      intro="Small bathrooms and powder rooms benefit from smart layouts and targeted finishes. The planner flags narrow circulation and shower-size constraints."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Bathroom Remodeling", href: "/bathroom-remodeling/rockville-md" }, { label: "Small Bathrooms" }]}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <InfoCard title="Value-focused choices">
          <ul className="list-disc space-y-1 pl-5">
            <li>Retain the existing layout</li>
            <li>Stock vanity and standard fixtures</li>
            <li>Tile limited to wet areas</li>
            <li>Standard shower enclosure</li>
          </ul>
        </InfoCard>
        <InfoCard title="Illustrative range">
          <p>$2,500 – $6,500 for a powder-room refresh; $9,000 – $22,000 for a small full bathroom remodel in Rockville.</p>
        </InfoCard>
      </div>
      <PageCta title="Plan your small bathroom" label="Start the planner" href="/bathroom-remodeling/rockville-md/planner" />
    </PublicPage>
  );
}
