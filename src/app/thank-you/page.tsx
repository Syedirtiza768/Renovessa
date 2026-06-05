import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; name?: string }>;
}) {
  const params = await searchParams;
  const ref = params.ref || "RNV-2026-00000";
  const name = params.name || "there";

  const steps = ["Reviewing", "Qualifying", "Scheduling", "Confirmed"];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <div className="card-accent p-6 sm:p-8">
          <h1 className="text-xl font-bold text-slate sm:text-2xl">
            Your project request is received, {name}.
          </h1>
          <p className="mt-4 text-muted">
            Renovessa will reach out within 2 business hours to confirm your project details.
          </p>
          <p className="mt-6 font-mono text-lg text-copper">{ref}</p>

          {/* Progress steps — wraps gracefully on small screens */}
          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
            {steps.map((step, i) => (
              <span key={step} className={i === 0 ? "font-semibold text-copper" : "text-muted"}>
                {step}
              </span>
            ))}
          </div>

          <Link href="/login" className="btn-secondary mt-8 inline-flex">
            Track in Homeowner Portal
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
