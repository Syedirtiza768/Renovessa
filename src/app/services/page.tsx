import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage, PageCta } from "@/components/marketing/PublicPage";
import { LANDING_CATEGORIES } from "@/lib/landing-data";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Home Improvement Project Types and Estimates in the DMV",
  description:
    "Explore the HVAC, roofing, remodeling, plumbing, electrical, and repair projects Renovessa can help homeowners scope and estimate.",
  path: "/services",
});

export default function ServicesPage() {
  return (
    <PublicPage
      eyebrow="Project types"
      title="Start with a better scope, whatever the trade."
      intro="Renovessa's estimator can help organize common home-improvement projects. Estimator support does not guarantee contractor availability; trade and ZIP capacity are checked after an RFQ is submitted."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Services" }]}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LANDING_CATEGORIES.map((category) => (
          <article key={category.id} className="landing-card p-6">
            <p className="font-mono-landing text-xs text-ink-40">{category.ref}</p>
            <h2 className="mt-3 text-lg font-semibold text-ink-100">{category.label}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-70">{category.description}</p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm font-medium">
              {category.id === "hvac" && <Link href="/services/hvac" className="text-ink-100 underline underline-offset-4">HVAC planning guide</Link>}
              <Link href="/estimate" className="text-accent">Start estimate →</Link>
            </div>
          </article>
        ))}
      </div>
      <PageCta />
    </PublicPage>
  );
}
