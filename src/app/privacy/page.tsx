import type { Metadata } from "next";
import { PublicPage } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description: "How Renovessa collects, uses, shares, protects, and retains information submitted through estimates, RFQs, accounts, and contractor applications.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <PublicPage
      eyebrow="Privacy policy"
      title="How Renovessa handles your information."
      intro="Effective July 23, 2026. This policy describes the information used to provide the estimator, process RFQs, operate accounts, review contractor applications, and improve the service."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Privacy" }]}
    >
      <div className="prose-like space-y-8 text-sm leading-relaxed text-ink-70">
        <section><h2 className="text-xl font-semibold text-ink-100">Information collected</h2><p className="mt-3">Renovessa may collect project scope answers, ZIP code, address when needed for coordination, budget and timing preferences, notes, name, email, phone number, communication consent, account records, contractor business and credential information, communications, RFQ status, and operational audit events. Technical information such as device, browser, referral, and page interactions may be collected when analytics is enabled.</p></section>
        <section><h2 className="text-xl font-semibold text-ink-100">How information is used</h2><p className="mt-3">Information is used to calculate planning ranges, create and review RFQs, check trade and ZIP availability, communicate about a request, coordinate relevant contractor responses, provide account access, prevent abuse, maintain records, comply with law, and improve product performance.</p></section>
        <section><h2 className="text-xl font-semibold text-ink-100">Sharing</h2><p className="mt-3">Project and contact information may be shared with contractors or service providers as needed to process a submitted RFQ and operate Renovessa. Renovessa does not promise that every request will be routed or receive a response. Information may also be disclosed when legally required, to protect users or the service, or as part of a business transaction subject to applicable safeguards.</p></section>
        <section><h2 className="text-xl font-semibold text-ink-100">Communications and consent</h2><p className="mt-3">If you consent to calls or text messages about a project, Renovessa may use the number submitted for that purpose. Consent is not a condition of purchasing contractor services. Message and data rates may apply. Reply STOP to an automated text to opt out where supported, or contact Renovessa.</p></section>
        <section><h2 className="text-xl font-semibold text-ink-100">Retention and security</h2><p className="mt-3">Records are retained for operational, dispute, security, legal, and business needs. Renovessa uses reasonable safeguards, but no system can guarantee absolute security. Do not submit payment-card numbers, government identification numbers, passwords, or highly sensitive records in free-text project fields.</p></section>
        <section><h2 className="text-xl font-semibold text-ink-100">Your requests</h2><p className="mt-3">To request access, correction, or deletion where applicable, email <a href="mailto:ray@renovessa.com" className="font-medium text-accent">ray@renovessa.com</a> or call <a href="tel:+15714600006" className="font-medium text-accent">(571) 460-0006</a>. Renovessa may need to verify the request and may retain records when legally or operationally required.</p></section>
        <section><h2 className="text-xl font-semibold text-ink-100">Changes</h2><p className="mt-3">Material changes will be posted here with a revised effective date. Continued use after an update is governed by the updated policy to the extent permitted by law.</p></section>
      </div>
    </PublicPage>
  );
}
