import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { bathroomRockvilleEnabled } from "@/lib/feature-flags";
import { PublicPage, InfoCard, PageCta } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Primary Bathroom Remodels in Rockville, MD",
  description:
    "Plan a primary bathroom remodel in Rockville. Double vanities, custom showers, freestanding tubs, and premium finishes.",
  path: "/bathroom-remodeling/rockville-md/primary-bathrooms",
});

export default function PrimaryBathroomsPage() {
  if (!bathroomRockvilleEnabled()) notFound();
  return (
    <PublicPage
      eyebrow="Primary bathrooms · Rockville, MD"
      title="Primary bathroom remodels in Rockville."
      intro="Primary bathrooms carry the widest cost range because they often include layout changes, double vanities, custom showers, and freestanding tubs."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Bathroom Remodeling", href: "/bathroom-remodeling/rockville-md" }, { label: "Primary Bathrooms" }]}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <InfoCard title="Common scope">
          <ul className="list-disc space-y-1 pl-5">
            <li>Single-to-double vanity conversion</li>
            <li>Custom tiled shower with bench and niche</li>
            <li>Freestanding or alcove tub</li>
            <li>Heated tile floor</li>
            <li>Improved lighting and ventilation</li>
          </ul>
        </InfoCard>
        <InfoCard title="Illustrative range">
          <p>$18,000 – $45,000 for a primary bathroom remodel in Rockville, depending on layout changes and finish tier.</p>
        </InfoCard>
      </div>
      <PageCta title="Plan your primary bathroom" label="Start the planner" href="/bathroom-remodeling/rockville-md/planner" />
    </PublicPage>
  );
}
