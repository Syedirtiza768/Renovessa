import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Project Request Received",
  description: "Confirmation that Renovessa received a project request.",
  path: "/thank-you",
  noIndex: true,
});

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; name?: string; email?: string }>;
}) {
  const params = await searchParams;
  const ref = params.ref || "RNV-2026-00000";
  const name = params.name || "there";
  const email = params.email;

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
            Renovessa will review your request and contact you using the details you provided.
          </p>
          <p className="mt-6 font-mono text-lg text-copper">{ref}</p>

          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
            {steps.map((step, i) => (
              <span key={step} className={i === 0 ? "font-semibold text-copper" : "text-muted"}>
                {step}
              </span>
            ))}
          </div>

          {email && (
            <div className="mt-6 rounded-lg border border-rule bg-blueprint p-4 text-left text-sm">
              <p className="font-semibold">Your homeowner portal account</p>
              <p className="mt-1 text-muted">Use these credentials to track your project status.</p>
              <p className="mt-3"><span className="text-muted">Email:</span> <span className="font-mono">{email}</span></p>
              <p className="mt-1"><span className="text-muted">Password:</span> <span className="font-mono">shown on the form — check back on that page</span></p>
            </div>
          )}

          <Link href="/login" className="btn-secondary mt-8 inline-flex">
            Log in to Homeowner Portal
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
