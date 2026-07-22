import type { Metadata } from "next";
import { PublicPage, InfoCard } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Editorial and Corrections Policy",
  description: "See how Renovessa researches, reviews, dates, updates, sources, and corrects DMV home-improvement guidance.",
  path: "/editorial-policy",
});

export default function EditorialPolicyPage() {
  return (
    <PublicPage
      eyebrow="Editorial policy"
      title="Useful local guidance, transparent sources, visible corrections."
      intro="Renovessa publishes content to help DMV homeowners define scope, understand cost drivers, verify requirements, and compare contractor proposals."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Editorial Policy" }]}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <InfoCard title="Source priority"><p>Official permit, licensing, and consumer-protection sources come first. Contractor interviews and first-party RFQ or bid observations must be identified and qualified.</p></InfoCard>
        <InfoCard title="Authorship and review"><p>Substantive guides should identify the writer, appropriate technical reviewer, first publication date, and last substantive review date.</p></InfoCard>
        <InfoCard title="Cost claims"><p>Ranges must identify scope assumptions, geography, evidence type, limitations, and update date. Small first-party samples must not be presented as DMV-wide market statistics.</p></InfoCard>
        <InfoCard title="Automation"><p>Automation may assist research organization or drafting, but a human remains responsible for accuracy, sources, usefulness, and publication. Pages are not mass-produced by swapping location names.</p></InfoCard>
      </div>
      <section className="mt-10 rounded-lg border border-ink-15 bg-bone-1 p-6 text-sm leading-relaxed text-ink-70">
        <h2 className="text-xl font-semibold text-ink-100">Corrections</h2>
        <p className="mt-3">Send a correction request to <a href="mailto:ray@renovessa.com" className="font-medium text-accent">ray@renovessa.com</a> with the page URL, disputed statement, and supporting source. Material corrections should be reflected in the page&apos;s review history rather than hidden behind a new date.</p>
      </section>
    </PublicPage>
  );
}
