import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ContractorInquiryForm } from "@/components/ContractorInquiryForm";

export default function ForContractorsPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <h1 className="text-3xl font-bold text-slate md:text-4xl">
            Renovessa gives contractors verified appointments, not shared leads.
          </h1>
          <p className="mt-4 text-lg text-muted">
            Renovessa qualifies homeowner project requests, confirms appointment details, tracks the full audit trail, and routes each appointment exclusively to one contractor per trade and territory. You pay only when a qualified appointment is verified.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              { title: "Exclusive Appointments", desc: "One contractor per trade and ZIP cluster." },
              { title: "Homeowner-Confirmed", desc: "Billing triggered only after homeowner confirms." },
              { title: "Full Audit Trail", desc: "Call logs, SMS, calendar, check-in — all recorded." },
              { title: "Fair Dispute Policy", desc: "Evidence-based case files, not guesses." },
            ].map((item) => (
              <div key={item.title} className="card p-5">
                <h3 className="font-semibold">{item.title}</h3>
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
