import type { Metadata } from "next";
import { PublicPage, InfoCard } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contractor Credential Verification Methodology",
  description:
    "Understand the contractor license, business identity, insurance, service-area, and re-verification information Renovessa reviews before RFQ routing.",
  path: "/methodology/contractor-verification-methodology",
});

export default function VerificationMethodologyPage() {
  return (
    <PublicPage
      eyebrow="Verification methodology"
      title="What Renovessa reviews before routing an RFQ."
      intro="Verification is a dated review of specific information, not a permanent certification or guarantee of workmanship, price, conduct, availability, or project outcome."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Methodology" }, { label: "Contractor Verification" }]}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <InfoCard title="Business and license identity">
          <p>Match the business or individual name to the applicable official licensing record, review classification and status, and record the source and review date.</p>
        </InfoCard>
        <InfoCard title="Insurance information">
          <p>Request applicable insurance documentation and review named insured, policy type, carrier, and stated effective dates. Documentation review is not legal advice about coverage.</p>
        </InfoCard>
        <InfoCard title="Trade, ZIP, and capacity fit">
          <p>Confirm the contractor declares the relevant trade, service area, and current interest before routing a homeowner&apos;s project information.</p>
        </InfoCard>
        <InfoCard title="Re-verification and exceptions">
          <p>Credentials can expire, be suspended, or change. Expired or unresolved records should block new routing until reviewed. Exceptions must not be hidden behind a generic badge.</p>
        </InfoCard>
      </div>
      <section className="mt-10 rounded-lg border border-ink-15 bg-bone-1 p-6 text-sm leading-relaxed text-ink-70">
        <h2 className="text-xl font-semibold text-ink-100">Homeowner responsibility</h2>
        <p className="mt-3">Before signing or paying, re-check the current license with the official jurisdiction, confirm insurance, review the written contract, verify who will pull permits, and compare the actual scope. Renovessa&apos;s prior review does not replace those steps.</p>
        <p className="mt-4 font-medium text-ink-100">Methodology published: July 23, 2026.</p>
      </section>
    </PublicPage>
  );
}
