import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EstimateWizard } from "@/components/landing/EstimateWizard";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "DMV Home Improvement Cost Estimator",
  description:
    "Answer trade-specific questions, see a Washington DC metro planning range, and preview a scoped request for contractor bids.",
  path: "/estimate",
});

export default function EstimatePage() {
  return (
    <>
      <SiteHeader />
      <main className="landing-page min-h-screen bg-bone-0">
        <section className="border-b border-ink-15 bg-bone-1 px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <p className="landing-eyebrow">DMV cost estimator</p>
            <h1 className="landing-h2 mt-3">Scope your project and see a local planning range.</h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-70">
              The wizard uses your project details to calculate a ballpark for Washington, DC,
              Maryland, and Northern Virginia. Review the range before deciding whether to submit an RFQ.
            </p>
            <p className="mt-3 text-sm text-ink-40">
              This is not a contractor quote, offer, or guarantee. Read the{" "}
              <Link href="/methodology/estimate-methodology" className="font-medium text-ink-100 underline underline-offset-4">methodology</Link>.
            </p>
          </div>
        </section>
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <EstimateWizard variant="embedded" />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
