import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage, InfoCard, PageCta } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "DMV Home Improvement Estimate Locations",
  description:
    "Plan home-improvement projects across Washington DC, Maryland, and Northern Virginia, with contractor availability checked by trade and ZIP.",
  path: "/locations",
});

export default function LocationsPage() {
  return (
    <PublicPage
      eyebrow="Service geography"
      title="Local planning for Washington, DC, Maryland, and Northern Virginia."
      intro="Renovessa's estimator is calibrated for the DC metro area. Contractor capacity is narrower and can change, so each submitted RFQ is checked against the current trade and ZIP coverage."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Locations" }]}
    >
      <div className="grid gap-5 md:grid-cols-3">
        <InfoCard title="Northern Virginia">
          <p>Initial organic and operational focus, beginning with HVAC planning in Fairfax County.</p>
          <Link href="/locations/northern-virginia" className="mt-4 inline-block font-medium text-accent">Explore Northern Virginia →</Link>
        </InfoCard>
        <InfoCard title="Washington, DC">
          <p>Estimator access is available. Contractor response availability depends on the trade, scope, and ZIP.</p>
        </InfoCard>
        <InfoCard title="Maryland suburbs">
          <p>Estimator access is available. Contractor response availability depends on the trade, scope, and ZIP.</p>
        </InfoCard>
      </div>
      <div className="mt-10 border-l-4 border-accent bg-accent-100 p-6 text-sm leading-relaxed text-ink-70">
        A city or county appearing here is not a promise that every trade is available. The RFQ review
        confirms current fit before project information is routed.
      </div>
      <PageCta />
    </PublicPage>
  );
}
