import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage, InfoCard, PageCta } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "DMV Home Improvement Cost Guides",
  description:
    "Understand how scope, materials, site conditions, permits, and location affect home-improvement costs across the Washington DC metro area.",
  path: "/cost-guides",
});

export default function CostGuidesPage() {
  return (
    <PublicPage
      eyebrow="DMV cost guides"
      title="Local project-cost guidance without false precision."
      intro="A useful cost range begins with a defined scope. Renovessa combines trade-specific questions with documented DMV assumptions, then shows the factors that can move the final contractor price."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Cost Guides" }]}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <InfoCard title="HVAC planning">
          <p>Scope AC, furnace, heat-pump, and ductwork work before comparing proposals.</p>
          <Link href="/services/hvac" className="mt-4 inline-block font-medium text-accent">HVAC planning guide →</Link>
        </InfoCard>
        <InfoCard title="How ranges are built">
          <p>See the inputs, geographic assumptions, inclusions, exclusions, confidence limits, and update process behind calculator results.</p>
          <Link href="/methodology/estimate-methodology" className="mt-4 inline-block font-medium text-accent">Estimate methodology →</Link>
        </InfoCard>
      </div>
      <section className="mt-10 rounded-lg border border-ink-15 bg-bone-1 p-6">
        <h2 className="text-xl font-semibold text-ink-100">What every Renovessa cost guide will show</h2>
        <ul className="mt-4 grid list-disc gap-2 pl-5 text-sm leading-relaxed text-ink-70 sm:grid-cols-2">
          <li>Plain-language low, middle, and high planning scenarios</li>
          <li>The exact scope assumptions behind each scenario</li>
          <li>Common inclusions, exclusions, and hidden dependencies</li>
          <li>Permit and credential sources for the jurisdiction</li>
          <li>A named review date and material revision history</li>
          <li>First-party bid evidence only when the sample is sufficient</li>
        </ul>
      </section>
      <PageCta />
    </PublicPage>
  );
}
