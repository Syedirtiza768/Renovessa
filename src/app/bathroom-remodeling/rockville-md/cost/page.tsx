import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { bathroomRockvilleEnabled } from "@/lib/feature-flags";
import { PublicPage, InfoCard, PageCta } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Bathroom Remodeling Costs in Rockville, MD",
  description:
    "Planning ranges for powder-room refreshes, guest baths, primary baths, tub-to-shower conversions, and full gut remodels in Rockville, Maryland.",
  path: "/bathroom-remodeling/rockville-md/cost",
});

export default function CostPage() {
  if (!bathroomRockvilleEnabled()) notFound();
  return (
    <PublicPage
      eyebrow="Cost guide · Rockville, MD"
      title="Bathroom remodeling costs in Rockville, Maryland."
      intro="Planning ranges below are illustrative and depend on bathroom size, scope, finish tier, and site conditions. Run the planner for a project-specific range."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Bathroom Remodeling", href: "/bathroom-remodeling/rockville-md" }, { label: "Costs" }]}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <InfoCard title="What drives the spread">
          <ul className="list-disc space-y-1 pl-5">
            <li>Project objective (refresh vs. full gut)</li>
            <li>Bathroom type and floor area</li>
            <li>Finish tier and material selections</li>
            <li>Plumbing and electrical relocation</li>
            <li>Tile coverage and complexity</li>
            <li>Permit and inspection requirements</li>
            <li>Condominium access and disposal</li>
          </ul>
        </InfoCard>
        <InfoCard title="Illustrative ranges">
          <ul className="list-disc space-y-1 pl-5">
            <li>Powder-room refresh: $2,500 – $6,500</li>
            <li>Guest bath remodel: $9,000 – $22,000</li>
            <li>Primary bath remodel: $18,000 – $45,000</li>
            <li>Tub-to-shower conversion: $7,000 – $18,000</li>
            <li>Walk-in shower: $9,000 – $22,000</li>
            <li>Full gut remodel: $22,000 – $55,000</li>
          </ul>
        </InfoCard>
      </div>
      <PageCta title="Get a project-specific range" label="Start the planner" href="/bathroom-remodeling/rockville-md/planner" />
    </PublicPage>
  );
}
