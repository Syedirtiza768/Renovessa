import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ContractorInquiryForm } from "@/components/ContractorInquiryForm";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Receive Scoped Home Improvement RFQs in the DMV",
  description:
    "Apply to receive relevant, scope-rich homeowner RFQs in your DMV trade and service area. Availability and commercial terms are reviewed before activation.",
  path: "/for-contractors",
});

export default function ForContractorsPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <p className="landing-eyebrow">For contractors</p>
          <h1 className="mt-3 text-3xl font-bold text-slate md:text-4xl">Review scoped RFQs for the trades and ZIPs you serve.</h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted">
            Renovessa helps homeowners define the job before outreach. Approved contractors may receive
            relevant RFQs based on trade, service area, current capacity, and credential review. Application
            does not guarantee activation, exclusivity, job volume, or revenue.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              { title: "Structured scope", desc: "Trade-specific answers, project context, timing, and homeowner notes in one RFQ." },
              { title: "Relevant routing", desc: "Requests are considered against your declared trades, ZIPs, and availability." },
              { title: "Published expectations", desc: "Credential review, response expectations, and commercial terms are documented before activation." },
              { title: "Homeowner choice", desc: "A homeowner may compare, decline, negotiate, or choose another option without obligation to Renovessa." },
            ].map((item) => (
              <div key={item.title} className="card p-5">
                <h2 className="font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm text-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="border-t border-rule bg-white py-16">
          <div className="mx-auto max-w-xl px-4 sm:px-6">
            <ContractorInquiryForm />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
