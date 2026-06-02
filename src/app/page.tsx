import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProjectRequestForm } from "@/components/ProjectRequestForm";
import { SERVICE_CATEGORIES } from "@/lib/constants";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:grid lg:grid-cols-2 lg:gap-12 lg:py-24">
          <div>
            <h1 className="text-4xl font-bold leading-tight text-slate md:text-5xl">
              One project request. A vetted contractor appointment.
            </h1>
            <p className="mt-4 text-lg text-muted">
              Submit your project details and Renovessa will help connect you with a vetted local contractor in the DMV — Washington DC, Maryland, and Northern Virginia. No endless calling. No confusing searches.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#project-form" className="btn-primary">Submit My Project Request</Link>
              <Link href="/for-contractors" className="btn-secondary">For Contractors</Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-4 text-xs text-muted">
              <span>✓ Free to submit</span>
              <span>✓ No obligation</span>
              <span>✓ DMV local coverage</span>
              <span>✓ Vetted contractor network</span>
              <span>✓ Confirmed appointments</span>
            </div>
          </div>
          <div className="mt-10 lg:mt-0">
            <div className="card-accent p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-copper">Appointment Timeline</p>
              <ol className="mt-4 space-y-4">
                {["Submitted", "Qualifying", "Scheduled", "Confirmed"].map((step, i) => (
                  <li key={step} className="flex items-center gap-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${i === 0 ? "bg-copper text-white" : "bg-blueprint text-slate"}`}>{i + 1}</span>
                    <span className="font-medium">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="border-y border-rule bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-semibold text-slate">Select Your Project Type</h2>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {SERVICE_CATEGORIES.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/#project-form`}
                  className="card group p-4 text-center transition hover:border-copper"
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <p className="mt-2 text-sm font-medium group-hover:text-copper">{cat.label}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-semibold text-slate">How It Works</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-4">
              {[
                { title: "Submit Your Project", desc: "Fill out a short request form — tell Renovessa what you need done." },
                { title: "Renovessa Qualifies", desc: "Our team reviews your request and confirms details by phone." },
                { title: "Contractor Matched", desc: "A vetted local contractor is selected for your project type and area." },
                { title: "Appointment Confirmed", desc: "You receive call, SMS, and calendar confirmation with appointment details." },
              ].map((item, i) => (
                <div key={item.title} className="card p-5">
                  <span className="font-mono text-sm text-copper">0{i + 1}</span>
                  <h3 className="mt-2 font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-rule bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid gap-8 lg:grid-cols-3">
              {[
                { title: "One Request, One Contractor", desc: "Your project is not sold to five companies at once. Renovessa routes your request to one vetted contractor." },
                { title: "Appointment, Not Just a Lead", desc: "You get a confirmed appointment date, not a flood of sales calls." },
                { title: "Backed by a Verification Trail", desc: "Every appointment includes call records, SMS confirmation, and a check-in log." },
              ].map((item) => (
                <div key={item.title} className="card-accent p-6">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <ProjectRequestForm />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
