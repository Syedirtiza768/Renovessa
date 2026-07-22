import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage, InfoCard, PageCta } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Home Improvement and HVAC Estimates in Fairfax County, VA",
  description:
    "Plan a Fairfax County HVAC or home-improvement project with local permit sources, scope guidance, and a DMV planning estimator.",
  path: "/locations/northern-virginia/fairfax-county",
});

export default function FairfaxCountyPage() {
  return (
    <PublicPage
      eyebrow="Fairfax County, Virginia"
      title="Start a Fairfax County project with scope and permit context."
      intro="Fairfax County project requirements depend on the exact work. Renovessa's first detailed local focus is HVAC planning, with availability confirmed for each trade and ZIP after submission."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Locations", href: "/locations" }, { label: "Northern Virginia", href: "/locations/northern-virginia" }, { label: "Fairfax County" }]}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <InfoCard title="HVAC permit context">
          <p>Fairfax County states that mechanical permits cover new, replacement, repair, or conversion of HVAC systems. The project and property classification determine the exact process.</p>
          <a href="https://www.fairfaxcounty.gov/landdevelopment/node/792" target="_blank" rel="noreferrer" className="mt-4 inline-block font-medium text-accent">Official residential mechanical permit page →</a>
        </InfoCard>
        <InfoCard title="Contractor-license check">
          <p>Virginia DPOR advises homeowners to use licensed contractors, check disciplinary history, compare written estimates, and insist on a detailed contract.</p>
          <a href="https://www.dpor.virginia.gov/Consumers/Guide_Contractor" target="_blank" rel="noreferrer" className="mt-4 inline-block font-medium text-accent">Virginia DPOR consumer guide →</a>
        </InfoCard>
      </div>
      <section className="mt-10 rounded-lg border border-ink-15 bg-bone-1 p-6">
        <h2 className="text-xl font-semibold text-ink-100">Information to collect before requesting HVAC bids</h2>
        <ul className="mt-4 grid list-disc gap-2 pl-5 text-sm leading-relaxed text-ink-70 sm:grid-cols-2">
          <li>Equipment type, age, model, and fuel</li>
          <li>Home type, size, and number of zones</li>
          <li>Current symptoms or replacement goal</li>
          <li>Ductwork, airflow, comfort, or humidity concerns</li>
          <li>Indoor and outdoor unit access</li>
          <li>Electrical, drainage, pad, or line-set work</li>
          <li>Permit and inspection responsibility</li>
          <li>Warranty, maintenance, exclusions, and payment terms</li>
        </ul>
        <p className="mt-5 text-xs leading-relaxed text-ink-40">
          Source links were reviewed on July 23, 2026. Requirements can change; confirm the current rules with Fairfax County and the applicable licensing authority.
        </p>
      </section>
      <div className="mt-8 text-sm text-ink-70">
        Also see the <Link href="/services/hvac" className="font-medium text-ink-100 underline underline-offset-4">DMV HVAC planning guide</Link>.
      </div>
      <PageCta title="Estimate a Fairfax County project" />
    </PublicPage>
  );
}
