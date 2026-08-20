import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EstimateWizard } from "@/components/landing/EstimateWizard";
import {
  LANDING_CATEGORIES,
  STANDARD_ESTIMATOR_IDS,
  type StandardEstimatorId,
} from "@/lib/landing-data";
import { pageMetadata } from "@/lib/seo";

type TradePageProps = { params: Promise<{ trade: string }> };

function resolveTrade(value: string): StandardEstimatorId | null {
  return STANDARD_ESTIMATOR_IDS.includes(value as StandardEstimatorId)
    ? (value as StandardEstimatorId)
    : null;
}

export function generateStaticParams() {
  return STANDARD_ESTIMATOR_IDS.map((trade) => ({ trade }));
}

export async function generateMetadata({ params }: TradePageProps): Promise<Metadata> {
  const { trade: rawTrade } = await params;
  const trade = resolveTrade(rawTrade);
  const category = trade ? LANDING_CATEGORIES.find((item) => item.id === trade) : null;
  if (!trade || !category) return {};

  return pageMetadata({
    title: `${category.label} Cost Estimator in the DMV`,
    description: `Answer focused ${category.label.toLowerCase()} project questions, see a DMV planning range, and prepare a request for contractor bids.`,
    path: `/estimate/${trade}`,
  });
}

export default async function DedicatedEstimatePage({ params }: TradePageProps) {
  const { trade: rawTrade } = await params;
  const trade = resolveTrade(rawTrade);
  const category = trade ? LANDING_CATEGORIES.find((item) => item.id === trade) : null;
  if (!trade || !category) notFound();

  return (
    <>
      <SiteHeader />
      <main className="landing-page min-h-screen bg-bone-0">
        <section className="border-b border-ink-15 bg-bone-1 px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <p className="landing-eyebrow">Dedicated {category.label} estimator</p>
            <h1 className="landing-h2 mt-3">Scope your {category.label.toLowerCase()} project.</h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-70">
              Answer a few trade-specific questions to see a DMV planning range and prepare a request for contractor bids.
            </p>
            <p className="mt-3 text-sm text-ink-40">
              This is a planning estimate, not a contractor quote, offer, or guarantee.
            </p>
          </div>
        </section>
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <EstimateWizard variant="embedded" initialTrade={trade} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
