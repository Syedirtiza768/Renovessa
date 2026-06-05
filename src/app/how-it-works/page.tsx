import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export default function HowItWorksPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold text-slate">How Renovessa Works</h1>
        <p className="mt-4 text-lg text-muted">
          Renovessa is a verified appointment partner — not a lead-generation site. Every appointment is qualified, confirmed, tracked, and auditable.
        </p>
        <div className="mt-10 space-y-6">
          {[
            "Homeowner submits a project request through Renovessa.com",
            "Operations agent reviews and qualifies the request via call and/or SMS",
            "Homeowner is confirmed as reachable; project is real and service area is covered",
            "An available contractor in the matching capacity cell is identified",
            "Contractor accepts the appointment through the Contractor Portal",
            "Calendar invite and SMS reminders are sent to both parties",
            "Contractor checks in at the appointment location",
            "Homeowner confirms the appointment occurred",
            "Billing is triggered only after homeowner verification",
          ].map((step, i) => (
            <div key={i} className="card flex gap-4 p-4">
              <span className="font-mono text-copper">{String(i + 1).padStart(2, "0")}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
        <Link href="/#request" className="btn-primary mt-10 inline-flex">Submit My Project Request</Link>
      </main>
      <SiteFooter />
    </>
  );
}
