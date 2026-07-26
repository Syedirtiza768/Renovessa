import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { bathroomRockvilleEnabled, BATHROOM_PERMIT_NAVIGATOR_ENABLED } from "@/lib/feature-flags";
import { PublicPage, InfoCard, PageCta } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Bathroom Remodeling Permits in Rockville, MD",
  description:
    "Likely permit categories for Rockville and Montgomery County bathroom remodels. The planner produces a project-specific assessment with cautious wording.",
  path: "/bathroom-remodeling/rockville-md/permits",
});

export default function PermitsPage() {
  if (!bathroomRockvilleEnabled()) notFound();
  return (
    <PublicPage
      eyebrow="Permit navigator · Rockville, MD"
      title="Bathroom remodeling permits in Rockville."
      intro="Permit rules depend on the exact scope. The planner asks a few questions and outputs likely permit categories with cautious wording — never a legal determination."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Bathroom Remodeling", href: "/bathroom-remodeling/rockville-md" }, { label: "Permits" }]}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <InfoCard title="When a permit is likely required">
          <ul className="list-disc space-y-1 pl-5">
            <li>Creating a new bathroom</li>
            <li>Structural framing or wall changes</li>
            <li>Plumbing changes or fixture relocation</li>
            <li>Electrical wiring or new lighting circuits</li>
          </ul>
        </InfoCard>
        <InfoCard title="When contractor verification is needed">
          <ul className="list-disc space-y-1 pl-5">
            <li>Lighting additions vs. fixture swaps</li>
            <li>Ventilation and ductwork modifications</li>
            <li>HOA / condo board approval</li>
            <li>Load-bearing wall determination</li>
          </ul>
        </InfoCard>
      </div>
      <p className="mt-8 text-xs text-ink-40">
        Source links and official jurisdiction references are maintained in the admin content system. Requirements
        can change; confirm current rules with the City of Rockville, Montgomery County, and the Maryland MHIC.
      </p>
      {BATHROOM_PERMIT_NAVIGATOR_ENABLED && (
        <PageCta title="Run the permit navigator" label="Open the planner" href="/bathroom-remodeling/rockville-md/planner" />
      )}
    </PublicPage>
  );
}
