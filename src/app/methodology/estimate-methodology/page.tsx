import type { Metadata } from "next";
import { PublicPage, InfoCard, PageCta } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "How Renovessa Calculates DMV Planning Ranges",
  description:
    "Read the inputs, assumptions, rounding, confidence labels, exclusions, and limitations behind Renovessa home-improvement planning ranges.",
  path: "/methodology/estimate-methodology",
});

export default function EstimateMethodologyPage() {
  return (
    <PublicPage
      eyebrow="Estimate methodology"
      title="How Renovessa calculates a project planning range."
      intro="The estimator applies documented trade rules to the information a homeowner enters. A numeric range is shown only when the exact model version has passed the claim-evidence publication gate; it is never a contractor quote, appraisal, offer, or guarantee."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Methodology" }, { label: "Estimate Methodology" }]}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <InfoCard title="Inputs">
          <p>Inputs vary by trade and can include job type, system or project size, age, materials, finish level, property type, access, urgency, and homeowner notes.</p>
        </InfoCard>
        <InfoCard title="Calculation">
          <p>Each trade has a versioned internal base range or unit-cost assumption and a unique evidence record. Selected scope factors adjust that range. Results are rounded to planning increments rather than false precision.</p>
        </InfoCard>
        <InfoCard title="Confidence labels">
          <p>“Solid” is used for narrower common service scopes, “rough” for work with meaningful selection or site variation, and “wide” for work where concealed conditions or scope differences can dominate.</p>
        </InfoCard>
        <InfoCard title="Current evidence limitation">
          <p>The present rules are modeled planning assumptions and are marked pending source review. Until representative evidence is attached and the model version is approved, the public estimator withholds its numeric output.</p>
        </InfoCard>
      </div>
      <section className="mt-10 rounded-lg border border-ink-15 bg-bone-1 p-6">
        <h2 className="text-xl font-semibold text-ink-100">What can change the final price</h2>
        <ul className="mt-4 grid list-disc gap-2 pl-5 text-sm leading-relaxed text-ink-70 sm:grid-cols-2">
          <li>Site conditions, concealed damage, and code corrections</li>
          <li>Equipment, material, finish, and warranty selections</li>
          <li>Permit, inspection, design, engineering, HOA, and disposal needs</li>
          <li>Access, parking, occupied-home constraints, and scheduling</li>
          <li>Scope inclusions, exclusions, allowances, and change orders</li>
          <li>Contractor availability and market conditions</li>
        </ul>
      </section>
      <section className="mt-10 text-sm leading-relaxed text-ink-70">
        <h2 className="text-xl font-semibold text-ink-100">Review and update policy</h2>
        <p className="mt-3">The model should be reviewed when new verified bid evidence becomes available and at least quarterly for volatile project categories. A page date should change only after a substantive review or model revision.</p>
        <p className="mt-3 font-medium text-ink-100">Last substantive review: July 23, 2026.</p>
      </section>
      <PageCta />
    </PublicPage>
  );
}
