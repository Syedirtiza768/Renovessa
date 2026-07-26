import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { bathroomRockvilleEnabled } from "@/lib/feature-flags";
import { PublicPage, InfoCard, PageCta } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Accessible Bathrooms in Rockville, MD",
  description:
    "Plan an accessible or aging-in-place bathroom in Rockville. Curbless showers, grab bars, comfort-height toilets, and wider doorways.",
  path: "/bathroom-remodeling/rockville-md/accessible-bathrooms",
});

export default function AccessibleBathroomsPage() {
  if (!bathroomRockvilleEnabled()) notFound();
  return (
    <PublicPage
      eyebrow="Accessible bathrooms · Rockville, MD"
      title="Accessible and aging-in-place bathrooms in Rockville."
      intro="Accessibility upgrades improve safety and independence. The planner captures curbless showers, shower seats, grab-bar blocking, non-slip flooring, wider doorways, lever handles, comfort-height toilets, and wheelchair turning considerations."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Bathroom Remodeling", href: "/bathroom-remodeling/rockville-md" }, { label: "Accessible Bathrooms" }]}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <InfoCard title="Common features">
          <ul className="list-disc space-y-1 pl-5">
            <li>Curbless shower with bench</li>
            <li>Grab-bar blocking and installed grab bars</li>
            <li>Non-slip flooring</li>
            <li>Wider doorway and lever handles</li>
            <li>Comfort-height toilet</li>
            <li>Improved lighting and lower storage</li>
          </ul>
        </InfoCard>
        <InfoCard title="Important note">
          <p>Do not label a residential design as ADA compliant unless professionally reviewed. The planner flags accessibility features and includes them in the contractor brief.</p>
        </InfoCard>
      </div>
      <PageCta title="Plan an accessible bathroom" label="Start the planner" href="/bathroom-remodeling/rockville-md/planner" />
    </PublicPage>
  );
}
