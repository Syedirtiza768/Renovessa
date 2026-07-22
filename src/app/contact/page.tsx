import type { Metadata } from "next";
import { PublicPage, InfoCard } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact Renovessa",
  description: "Contact Renovessa about a DMV home-improvement estimate, RFQ, contractor application, privacy request, or correction.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <PublicPage
      eyebrow="Contact"
      title="Talk with Renovessa."
      intro="Contact us about an estimate or RFQ, contractor application, credential correction, privacy request, or published content."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <InfoCard title="Phone">
          <p><a href="tel:+15714600006" className="font-medium text-accent">(571) 460-0006</a></p>
          <p className="mt-2">If we miss you, leave your name, callback number, and RFQ reference if one exists. Do not send payment-card or identity-document information.</p>
        </InfoCard>
        <InfoCard title="Email">
          <p><a href="mailto:ray@renovessa.com" className="font-medium text-accent">ray@renovessa.com</a></p>
          <p className="mt-2">For corrections, include the page URL and the source that supports the requested change.</p>
        </InfoCard>
      </div>
      <section className="mt-10 rounded-lg border border-ink-15 bg-bone-1 p-6 text-sm leading-relaxed text-ink-70">
        <h2 className="text-lg font-semibold text-ink-100">Emergency and safety issues</h2>
        <p className="mt-3">Renovessa is not an emergency service. For immediate danger, fire, gas odor, electrical hazard, structural instability, or a medical emergency, leave the area when appropriate and contact the relevant emergency service or utility.</p>
      </section>
    </PublicPage>
  );
}
