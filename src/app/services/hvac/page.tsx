import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { PublicPage, InfoCard, PageCta } from "@/components/marketing/PublicPage";
import { absoluteUrl, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "HVAC Cost Estimates and Contractor Bids in the DMV",
  description:
    "Plan an AC, furnace, heat-pump, ductwork, or HVAC repair project in Washington DC, Maryland, or Northern Virginia.",
  path: "/services/hvac",
});

export default function HvacServicePage() {
  return (
    <PublicPage
      eyebrow="HVAC planning"
      title="Plan an HVAC repair or replacement before requesting bids."
      intro="Scope an AC, furnace, heat-pump, or ductwork project, see a DMV planning range, and create one organized request for contractor responses."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Services", href: "/services" }, { label: "HVAC" }]}
    >
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Service",
        name: "HVAC project estimate and RFQ coordination",
        serviceType: "HVAC project planning and request-for-quote coordination",
        provider: { "@type": "Organization", name: "Renovessa", url: absoluteUrl("/") },
        areaServed: ["Washington, DC", "Maryland", "Northern Virginia"],
        url: absoluteUrl("/services/hvac"),
      }} />
      <div className="grid gap-5 md:grid-cols-2">
        <InfoCard title="Projects the estimator can scope">
          <ul className="list-disc space-y-2 pl-5">
            <li>Central AC or furnace repair and replacement</li>
            <li>Heat-pump installation or replacement</li>
            <li>Ductwork concerns and airflow problems</li>
            <li>System age, efficiency, access, and equipment context</li>
          </ul>
        </InfoCard>
        <InfoCard title="What can change final pricing">
          <ul className="list-disc space-y-2 pl-5">
            <li>Equipment size, efficiency, brand, and matched components</li>
            <li>Ductwork, electrical, drain, pad, or line-set changes</li>
            <li>Access, disposal, permits, inspections, and code requirements</li>
            <li>Site findings and the exact contractor scope</li>
          </ul>
        </InfoCard>
      </div>
      <section className="mt-10 rounded-lg border border-ink-15 bg-bone-1 p-6">
        <h2 className="text-xl font-semibold text-ink-100">Before comparing HVAC bids</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-70">
          Confirm that each proposal describes the same equipment, capacity, efficiency rating, controls,
          ancillary work, permit responsibility, warranty, exclusions, payment schedule, and disposal.
          A lower total can reflect a smaller scope rather than a better price.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium">
          <Link href="/resources" className="text-ink-100 underline underline-offset-4">Planning resources</Link>
          <Link href="/locations/northern-virginia/fairfax-county" className="text-ink-100 underline underline-offset-4">Fairfax County planning</Link>
        </div>
      </section>
      <PageCta title="Estimate an HVAC project" label="Start HVAC estimate" />
    </PublicPage>
  );
}
