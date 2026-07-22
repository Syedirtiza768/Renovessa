import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage, InfoCard, PageCta } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "How Renovessa Estimates Projects and Coordinates Contractor Bids",
  description:
    "See how Renovessa turns a trade-specific project scope into a DMV planning range and managed request for contractor bids.",
  path: "/how-it-works",
});

const steps = [
  ["01", "Scope the project", "Choose the trade and answer questions about size, condition, materials, access, timing, and other cost drivers."],
  ["02", "Review the planning range", "See a local ballpark based on the information entered. It is not a binding contractor quote or guaranteed final price."],
  ["03", "Preview and submit the RFQ", "Review the complete request for quote, your contact details, and the consent language before choosing whether to submit."],
  ["04", "Check availability and request responses", "Renovessa reviews the scope and current trade/ZIP capacity, then requests responses from relevant contractors when available."],
  ["05", "Compare the available options", "Review scope, exclusions, timing, and pricing. You decide whether to proceed; submitting an RFQ does not obligate you to hire."],
];

export default function HowItWorksPage() {
  return (
    <PublicPage
      eyebrow="The Renovessa process"
      title="From a scoped estimate to contractor bid options."
      intro="Renovessa is an estimate and RFQ coordination service. We do not perform construction work and the planning range is not a contractor quote."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "How It Works" }]}
    >
      <div className="grid gap-4">
        {steps.map(([number, title, body]) => (
          <div key={number} className="landing-card flex gap-5 p-6">
            <span className="font-mono-landing text-sm text-accent">{number}</span>
            <div>
              <h2 className="font-semibold text-ink-100">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-70">{body}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <InfoCard title="What Renovessa does">
          <p>Provides a planning tool, organizes the homeowner&apos;s project scope, checks operational availability, and coordinates contractor responses.</p>
        </InfoCard>
        <InfoCard title="What Renovessa does not do">
          <p>Renovessa does not provide a guaranteed quote, perform licensed trade work, guarantee contractor availability, or make the homeowner&apos;s hiring decision.</p>
        </InfoCard>
      </div>
      <p className="mt-8 text-sm text-ink-70">
        Learn how ranges are calculated in the{" "}
        <Link href="/methodology/estimate-methodology" className="font-medium text-ink-100 underline underline-offset-4">estimate methodology</Link>
        {" "}and how credential information is reviewed in the{" "}
        <Link href="/methodology/contractor-verification-methodology" className="font-medium text-ink-100 underline underline-offset-4">verification methodology</Link>.
      </p>
      <PageCta />
    </PublicPage>
  );
}
