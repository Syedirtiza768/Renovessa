import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EstimateWizard } from "@/components/landing/EstimateWizard";

export default function ForHomeownersPage() {
  return (
    <>
      <SiteHeader />
      <main className="landing-page bg-bone-0">
        <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="landing-eyebrow">For homeowners</p>
          <h1 className="landing-h2 mt-3">
            Get a DMV ballpark, then submit an RFQ
          </h1>
          <p className="mt-4 max-w-[58ch] text-lg text-ink-70">
            The estimate wizard is how you request work on Renovessa. Answer a few scoped questions,
            see a planning range, preview your RFQ, and submit — we solicit contractor bids and get
            back to you with options.
          </p>
          <p className="mt-3 text-sm text-ink-40">
            Prefer the homepage experience?{" "}
            <Link href="/#estimate" className="font-medium text-ink-100 underline underline-offset-2">
              Open the wizard on renovessa.com
            </Link>
            .
          </p>
        </section>
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <EstimateWizard variant="embedded" />
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
          <div className="rounded-lg border border-ink-15 bg-bone-1 p-5 text-sm text-ink-70">
            <p className="font-semibold text-ink-100">How it works</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>Scope your job in the wizard and get a DMV ballpark.</li>
              <li>Preview your RFQ, then submit it to Renovessa.</li>
              <li>We solicit bids from vetted contractors and return options (usually 1–2 business days).</li>
            </ol>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
