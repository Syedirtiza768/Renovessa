import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EstimateWizard } from "@/components/landing/EstimateWizard";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Home Improvement Estimates and Contractor Bids for DMV Homeowners",
  description:
    "Scope your project, see a Washington DC metro planning range, preview an RFQ, and decide whether Renovessa should coordinate contractor responses.",
  path: "/for-homeowners",
});

export default function ForHomeownersPage() {
  return (
    <>
      <SiteHeader />
      <main className="landing-page bg-bone-0">
        <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="landing-eyebrow">For homeowners</p>
          <h1 className="landing-h2 mt-3">Get a local planning range, then build a scoped RFQ.</h1>
          <p className="mt-4 max-w-[62ch] text-lg leading-relaxed text-ink-70">
            Answer trade-specific questions, see a DMV ballpark, and preview the request for quote
            before you submit. Renovessa reviews the scope and coordinates relevant contractor responses
            when capacity is available for your trade and ZIP.
          </p>
          <p className="mt-4 text-sm text-ink-40">
            The range is for planning, not a contractor quote or guarantee. Read our{" "}
            <Link href="/methodology/estimate-methodology" className="font-medium text-ink-100 underline underline-offset-4">
              estimate methodology
            </Link>
            .
          </p>
        </section>
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <EstimateWizard variant="embedded" />
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
          <div className="rounded-lg border border-ink-15 bg-bone-1 p-5 text-sm text-ink-70">
            <p className="font-semibold text-ink-100">What happens next</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>Scope the job and review the calculated planning range.</li>
              <li>Preview the RFQ and confirm exactly what you are submitting.</li>
              <li>Renovessa checks current coverage and requests relevant contractor responses when available.</li>
              <li>You compare the options returned and remain free to proceed or decline.</li>
            </ol>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
