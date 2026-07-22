import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage, InfoCard, PageCta } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "DMV Home Improvement Planning Resources",
  description:
    "Use official permit and license sources, estimate methodology, and bid-planning guidance before hiring a home-improvement contractor.",
  path: "/resources",
});

export default function ResourcesPage() {
  return (
    <PublicPage
      eyebrow="Planning resources"
      title="Use official sources and compare like-for-like scopes."
      intro="Permits, licenses, contracts, and bid inclusions vary across the DMV. These starting points help homeowners verify current information rather than relying on a generic checklist."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Resources" }]}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <InfoCard title="District of Columbia">
          <ul className="space-y-3">
            <li><a href="https://dob.dc.gov/node/1613176" target="_blank" rel="noreferrer" className="font-medium text-accent">DC Department of Buildings permit guidance →</a></li>
            <li><a href="https://dlcp.dc.gov/node/1618551" target="_blank" rel="noreferrer" className="font-medium text-accent">DC contractor licensing requirements →</a></li>
          </ul>
        </InfoCard>
        <InfoCard title="Virginia">
          <ul className="space-y-3">
            <li><a href="https://www.dpor.virginia.gov/Consumers/Guide_Contractor" target="_blank" rel="noreferrer" className="font-medium text-accent">Virginia DPOR hiring guide →</a></li>
            <li><a href="https://www.fairfaxcounty.gov/landdevelopment/when-permit-required" target="_blank" rel="noreferrer" className="font-medium text-accent">Fairfax County permit overview →</a></li>
          </ul>
        </InfoCard>
        <InfoCard title="Maryland">
          <ul className="space-y-3">
            <li><a href="https://labor.md.gov/license/mhic/" target="_blank" rel="noreferrer" className="font-medium text-accent">Maryland Home Improvement Commission →</a></li>
            <li><a href="https://labor.md.gov/license/mhic/mhiccontracts.shtml" target="_blank" rel="noreferrer" className="font-medium text-accent">Maryland contract requirements →</a></li>
          </ul>
        </InfoCard>
        <InfoCard title="Renovessa methods">
          <ul className="space-y-3">
            <li><Link href="/methodology/estimate-methodology" className="font-medium text-accent">How planning ranges are calculated →</Link></li>
            <li><Link href="/methodology/contractor-verification-methodology" className="font-medium text-accent">How credential information is reviewed →</Link></li>
          </ul>
        </InfoCard>
      </div>
      <p className="mt-8 text-sm leading-relaxed text-ink-40">
        These links were reviewed on July 23, 2026. Official requirements can change. Confirm current rules directly with the agency responsible for your project and property.
      </p>
      <PageCta />
    </PublicPage>
  );
}
