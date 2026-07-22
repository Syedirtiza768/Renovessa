import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="landing-page flex min-h-[60vh] items-center bg-bone-0 px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="landing-eyebrow">404 · Page not found</p>
          <h1 className="landing-h1 mt-3">This page is not in the project plan.</h1>
          <p className="mt-5 text-lg text-ink-70">Try the estimator, browse DMV cost guidance, or return to the home page.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link className="landing-btn-primary" href="/estimate">Estimate my project</Link>
            <Link className="landing-btn-ghost" href="/cost-guides">Browse cost guides</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
