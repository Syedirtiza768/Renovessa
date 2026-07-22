import type { Metadata } from "next";
import { PublicPage } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Calls and Text Messages",
  description: "Renovessa's disclosure for project-related calls and text messages, consent, frequency, charges, and opt-out options.",
  path: "/tcpa",
});

export default function TcpaPage() {
  return (
    <PublicPage
      eyebrow="Communication disclosure"
      title="Calls and texts about your Renovessa request."
      intro="This disclosure explains what you agree to when you submit a phone number and affirmatively consent to project-related communications."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Calls and Texts" }]}
    >
      <div className="space-y-8 text-sm leading-relaxed text-ink-70">
        <section><h2 className="text-xl font-semibold text-ink-100">What you authorize</h2><p className="mt-3">By checking the consent box and submitting a request, you authorize Renovessa to call or text the number you provide about that request, including through automated technology where permitted. Messages may cover intake, RFQ status, contractor coordination, scheduling, and account support.</p></section>
        <section><h2 className="text-xl font-semibold text-ink-100">Consent is optional</h2><p className="mt-3">Consent to automated calls or texts is not a condition of purchasing contractor services. You may contact Renovessa at <a className="font-medium text-accent" href="tel:+15714600006">(571) 460-0006</a> to discuss another communication method.</p></section>
        <section><h2 className="text-xl font-semibold text-ink-100">Frequency and charges</h2><p className="mt-3">Message frequency varies with the request. Message and data rates may apply under your carrier plan. Carriers are not liable for delayed or undelivered messages.</p></section>
        <section><h2 className="text-xl font-semibold text-ink-100">Opt out or get help</h2><p className="mt-3">Reply STOP to an automated text to opt out where supported. Reply HELP or contact <a className="font-medium text-accent" href="mailto:ray@renovessa.com">ray@renovessa.com</a> for help. An opt-out confirmation may be sent. Transactional communications required to administer an existing request may still be provided through another channel where lawful.</p></section>
        <section><h2 className="text-xl font-semibold text-ink-100">Privacy</h2><p className="mt-3">How Renovessa handles contact and project information is described in the <a className="font-medium text-accent" href="/privacy">Privacy Policy</a>. This disclosure was last reviewed July 23, 2026.</p></section>
      </div>
    </PublicPage>
  );
}
