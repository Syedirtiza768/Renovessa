import type { Metadata } from "next";
import { PublicPage } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Use",
  description: "Terms governing use of the Renovessa planning estimator, RFQ coordination service, public content, and account features.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <PublicPage
      eyebrow="Terms of use"
      title="Terms for using Renovessa."
      intro="Effective July 23, 2026. By using Renovessa, you agree to these terms. If you do not agree, do not submit an RFQ or use an account."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Terms" }]}
    >
      <div className="space-y-8 text-sm leading-relaxed text-ink-70">
        <section><h2 className="text-xl font-semibold text-ink-100">Planning and coordination service</h2><p className="mt-3">Renovessa provides project-planning tools and may coordinate contractor responses. Renovessa is not the contractor performing home-improvement work and is not a party to a homeowner&apos;s construction contract unless expressly stated in a separate written agreement.</p></section>
        <section><h2 className="text-xl font-semibold text-ink-100">No guaranteed quote or availability</h2><p className="mt-3">Calculator results are non-binding planning ranges. Final scope, price, permits, timing, warranty, and terms come from the contractor. Renovessa does not guarantee response volume, contractor availability, pricing, workmanship, licensing status at a future date, or project outcomes.</p></section>
        <section><h2 className="text-xl font-semibold text-ink-100">Homeowner responsibility</h2><p className="mt-3">You are responsible for reviewing proposals, confirming current licenses and insurance, checking references, understanding permits, reading contracts, evaluating financing, and deciding whom to hire. Do not rely on Renovessa as legal, engineering, architectural, financial, or safety advice.</p></section>
        <section><h2 className="text-xl font-semibold text-ink-100">Accurate and lawful use</h2><p className="mt-3">Provide accurate information, use the service only for lawful projects, protect account credentials, and do not probe, overload, scrape, interfere with, or misuse the service or another person&apos;s information.</p></section>
        <section><h2 className="text-xl font-semibold text-ink-100">Contractor terms</h2><p className="mt-3">Contractor application does not guarantee approval, exclusivity, RFQ volume, appointments, jobs, or revenue. Commercial terms, response expectations, and credential requirements may be governed by a separate written agreement.</p></section>
        <section><h2 className="text-xl font-semibold text-ink-100">Content and intellectual property</h2><p className="mt-3">Renovessa&apos;s site, estimator, designs, text, and software are protected by applicable law. You may use public guidance for personal planning, but may not reproduce or exploit the service at scale without permission.</p></section>
        <section><h2 className="text-xl font-semibold text-ink-100">Service changes and limitation</h2><p className="mt-3">Features, coverage, and availability may change. To the maximum extent allowed by law, Renovessa is provided without warranties not expressly stated here and is not liable for indirect or consequential losses arising from contractor work or reliance on a planning range.</p></section>
        <section><h2 className="text-xl font-semibold text-ink-100">Contact</h2><p className="mt-3">Questions may be sent to <a href="mailto:ray@renovessa.com" className="font-medium text-accent">ray@renovessa.com</a> or <a href="tel:+15714600006" className="font-medium text-accent">(571) 460-0006</a>.</p></section>
      </div>
    </PublicPage>
  );
}
