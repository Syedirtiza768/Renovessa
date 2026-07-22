import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export default function TrustPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold text-slate">Trust & Safety</h1>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {[
            { title: "License Verified", desc: "Every Renovessa contractor holds a valid state license for their trade." },
            { title: "Insurance Confirmed", desc: "General liability and workers' comp documentation required." },
            { title: "Review-Checked", desc: "Google ratings reviewed before contractor access is granted." },
            { title: "Appointment Audited", desc: "Every appointment tracked from scheduling to confirmation." },
          ].map((item) => (
            <div key={item.title} className="card-accent p-6">
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted">{item.desc}</p>
            </div>
          ))}
        </div>
        <Link href="/#estimate" className="btn-primary mt-10 inline-flex">Get Free Estimate &amp; RFQ</Link>
      </main>
      <SiteFooter />
    </>
  );
}
