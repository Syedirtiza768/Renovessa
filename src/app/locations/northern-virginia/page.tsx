import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage, InfoCard, PageCta } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Home Improvement Estimates in Northern Virginia",
  description:
    "Scope an HVAC, roofing, remodeling, electrical, plumbing, or repair project and see a Northern Virginia planning range before requesting bids.",
  path: "/locations/northern-virginia",
});

export default function NorthernVirginiaPage() {
  return (
    <PublicPage
      eyebrow="Northern Virginia"
      title="Scope a Northern Virginia project before comparing bids."
      intro="Local labor, permitting, property type, access, and equipment or material choices can move a project well beyond a generic national average. Renovessa starts with the actual scope."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Locations", href: "/locations" }, { label: "Northern Virginia" }]}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <InfoCard title="Initial focus: Fairfax County HVAC">
          <p>The first detailed Renovessa location cluster covers HVAC planning in Fairfax County. Expansion follows verified contractor capacity and locally researched content.</p>
          <Link href="/locations/northern-virginia/fairfax-county" className="mt-4 inline-block font-medium text-accent">Fairfax County guide →</Link>
        </InfoCard>
        <InfoCard title="Local factors to capture">
          <ul className="list-disc space-y-2 pl-5">
            <li>Detached home, townhouse, condo, or multifamily classification</li>
            <li>HOA or condo approvals and work-hour restrictions</li>
            <li>Permit, inspection, access, parking, and disposal requirements</li>
            <li>Existing system or structure conditions</li>
          </ul>
        </InfoCard>
      </div>
      <PageCta />
    </PublicPage>
  );
}
