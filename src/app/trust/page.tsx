import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage, InfoCard, PageCta } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Trust and Safety for Home Improvement RFQs",
  description:
    "Understand Renovessa's estimate disclosures, contractor credential review, information sharing, and homeowner verification responsibilities.",
  path: "/trust",
});

export default function TrustPage() {
  return (
    <PublicPage
      eyebrow="Trust and safety"
      title="Know what is checked, what is not, and what to verify yourself."
      intro="Home-improvement decisions affect your home, safety, and finances. Renovessa publishes its process so homeowners can evaluate each step without relying on vague trust badges."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Trust & Safety" }]}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <InfoCard title="Planning ranges, not quotes">
          <p>Calculator results depend on the scope entered and documented local assumptions. A contractor must inspect or review the actual project before confirming price.</p>
        </InfoCard>
        <InfoCard title="Credential review before routing">
          <p>Renovessa reviews applicable license and insurance information before routing an RFQ. The exact checks and review date should be recorded.</p>
        </InfoCard>
        <InfoCard title="Homeowner re-verification">
          <p>Credentials can expire or change. Confirm the contractor&apos;s current status with the relevant official source before signing a contract or paying.</p>
        </InfoCard>
        <InfoCard title="Controlled information sharing">
          <p>Project and contact information is used to process the RFQ and coordinate relevant responses. Renovessa does not promise that every submission will receive bids.</p>
        </InfoCard>
      </div>
      <div className="mt-10 rounded-lg border border-ink-15 bg-bone-1 p-6 text-sm leading-relaxed text-ink-70">
        <h2 className="text-lg font-semibold text-ink-100">Before signing a home-improvement contract</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <li>Verify the business name, license number, classification, status, and expiration date.</li>
          <li>Confirm insurance directly and understand what the policy covers.</li>
          <li>Compare written scopes, exclusions, allowances, permit responsibility, payment schedule, and warranties.</li>
          <li>Do not rely on Renovessa&apos;s planning range as the final contract price.</li>
        </ul>
      </div>
      <p className="mt-8 text-sm text-ink-70">
        Read the full{" "}
        <Link href="/methodology/contractor-verification-methodology" className="font-medium text-ink-100 underline underline-offset-4">contractor verification methodology</Link>
        {" "}and our{" "}
        <Link href="/privacy" className="font-medium text-ink-100 underline underline-offset-4">privacy policy</Link>.
      </p>
      <PageCta />
    </PublicPage>
  );
}
