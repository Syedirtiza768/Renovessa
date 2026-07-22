import type { Metadata } from "next";
import { PublicPage } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";
import { PRIVACY_VERSION } from "@/lib/compliance-versions";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description: "How Renovessa collects, uses, shares, protects, retains, and deletes information submitted through estimates, RFQs, accounts, and contractor applications.",
  path: "/privacy",
});

const contact = <><a href="mailto:ray@renovessa.com" className="font-medium text-accent">ray@renovessa.com</a> or <a href="tel:+15714600006" className="font-medium text-accent">(571) 460-0006</a></>;

export default function PrivacyPage() {
  return (
    <PublicPage
      eyebrow="Privacy policy"
      title="How Renovessa handles your information."
      intro={`Effective July 23, 2026 · Policy version ${PRIVACY_VERSION}. This policy covers Renovessa's estimator, RFQ coordination, accounts, contractor applications, communications, and public website.`}
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Privacy" }]}
    >
      <div className="prose-like space-y-8 text-sm leading-relaxed text-ink-70">
        <section><h2 className="text-xl font-semibold text-ink-100">Who operates the service</h2><p className="mt-3">Renovessa operates the service described here for users in Washington, DC, Maryland, and Northern Virginia. Questions and privacy requests may be directed to {contact}.</p></section>

        <section><h2 className="text-xl font-semibold text-ink-100">Information we collect</h2><p className="mt-3">We collect identifiers and contact details; ZIP code, address, project scope, photos or notes you submit, budget and timing preferences; estimator answers and ranges; account and authentication records; contractor business, service-area, insurance, licensing, and credential information; RFQ, bid, appointment, call, email, and support records; consent, policy acceptance, and opt-out evidence; and security/audit events. Technical evidence may include IP address, user agent, timestamps, referral information, and site interactions. If you use the AI advisor, your prompts and relevant conversation context may be sent to the AI service provider to generate a response.</p></section>

        <section><h2 className="text-xl font-semibold text-ink-100">Sources</h2><p className="mt-3">We receive information directly from homeowners, account users, contractor applicants, and communications with us; automatically from browsers, servers, email and telephone providers; from contractors responding to an RFQ; and, for contractor outreach or credential review, from public business directories and government licensing sources.</p></section>

        <section><h2 className="text-xl font-semibold text-ink-100">How we use information</h2><p className="mt-3">We use information to provide planning tools, create and review RFQs, check trade and ZIP coverage, request relevant contractor responses, operate accounts, send requested service communications, maintain consent and suppression records, review contractor credentials, prevent fraud and abuse, secure and debug the service, comply with law, handle disputes, measure service performance, and improve the product. We do not use a declined optional communication consent as a reason to deny the estimator or RFQ submission.</p></section>

        <section><h2 className="text-xl font-semibold text-ink-100">How information is disclosed</h2><p className="mt-3">We may disclose the project and contact details needed to process a submitted RFQ to relevant contractors. We use service providers for hosting, database operations, email delivery, telephone services when enabled, and AI generation when the advisor is used. Providers receive only the information needed for their work and are subject to contractual and security review. We may also disclose information to comply with law, protect people or the service, investigate abuse, or complete a business transaction subject to appropriate safeguards. We do not currently sell personal information for money or use it for cross-context behavioral advertising.</p></section>

        <section><h2 className="text-xl font-semibold text-ink-100">Calls, texts, and email</h2><p className="mt-3">Project calls and texts are optional and require an unchecked, affirmative selection. Consent is not a condition of purchasing contractor services. Message and data rates may apply. Reply STOP to supported automated texts, use an email unsubscribe link, or contact us to opt out. We retain suppression records so the opt-out remains effective. A service or legally required message may still be sent where permitted.</p></section>

        <section><h2 className="text-xl font-semibold text-ink-100">Retention and deletion</h2><p className="mt-3">Unsubmitted browser drafts are designed to remain on the user&apos;s device. Submitted RFQs, account and contractor records are retained while active and generally for up to seven years after the last material activity when needed for service, contract, dispute, tax, fraud, or legal purposes. Routine communications and delivery logs are generally retained for up to three years. Security logs are generally retained for up to one year. Consent evidence and suppression records may be retained longer to demonstrate and honor the person&apos;s choices. Backups expire on their normal rotation. We delete or de-identify records when the applicable period ends, unless a legal hold or documented exception applies.</p></section>

        <section><h2 className="text-xl font-semibold text-ink-100">Your choices and privacy requests</h2><p className="mt-3">Depending on where you live and applicable law, you may ask to access, correct, delete, or obtain a copy of personal information, opt out of certain processing, or appeal a denied request. Contact {contact} and describe the request. We will verify identity using information reasonably related to the account or submission and will not ask for a password by email. Authorized agents may be required to provide proof of authority. We may deny or limit a request where an exception applies, and will explain the decision and appeal path when required.</p></section>

        <section><h2 className="text-xl font-semibold text-ink-100">Security and incidents</h2><p className="mt-3">We use role-based access, password hashing, secure session cookies, transport encryption, restricted production access, audit logging, and vendor controls appropriate to the service. No system is risk-free. If an incident affects personal information, we investigate, contain, preserve evidence, assess legal notice duties, and notify affected people and regulators when required. Do not put passwords, payment-card numbers, government identification numbers, or medical information in free-text project fields.</p></section>

        <section><h2 className="text-xl font-semibold text-ink-100">Children</h2><p className="mt-3">Renovessa is intended for adults arranging home-improvement work and is not directed to children under 13. Contact us if you believe a child provided personal information.</p></section>

        <section><h2 className="text-xl font-semibold text-ink-100">Changes</h2><p className="mt-3">We version this policy and record the version acknowledged at RFQ submission. Material changes will be posted with a new effective date and, when required, additional notice or consent. A new version does not retroactively change the evidence associated with an earlier acceptance.</p></section>
      </div>
    </PublicPage>
  );
}
