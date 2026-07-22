import { APPOINTMENT_LOG, HERO_SERVICE_TAGS } from "@/lib/landing-data";
import { FIRST_JOB_MODE, LANDING_HEADLINE } from "@/lib/first-job-config";

export function LandingHero() {
  return (
    <section className="bg-bone-0 px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
      <div className="mx-auto grid max-w-[1440px] gap-10 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)] lg:gap-12">
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-ink-40">
            <span className="flex items-center gap-2">
              <span className="landing-pulse" aria-hidden />
              Estimates &amp; bids · DMV
            </span>
            <span className="hidden sm:inline" aria-hidden>
              |
            </span>
            <span>DC · MD · VA</span>
            <span className="hidden sm:inline" aria-hidden>
              |
            </span>
            <span>Free ballpark · RFQ · Contractor bids</span>
          </div>

          {FIRST_JOB_MODE ? (
            <>
              <h1 className="landing-h1 mt-6 max-w-[18ch]">
                {LANDING_HEADLINE || "Need home improvement help in the DMV?"}
              </h1>
              <p className="mt-5 max-w-[52ch] text-lg text-ink-70">
                Walk through our estimate wizard, get a real DMV ballpark, and submit an RFQ.
                Renovessa collects contractor bids and gets back to you — not a blast of cold sales
                calls.
              </p>
            </>
          ) : (
            <>
              <h1 className="landing-h1 mt-6 max-w-[18ch]">
                Tell Renovessa what <em className="font-serif-landing italic">needs</em> doing around the
                house.
              </h1>
              <p className="mt-5 max-w-[52ch] text-lg text-ink-70">
                Use the estimate wizard to scope the full job, see a ballpark cost for the DMV, and
                submit an RFQ. We solicit bids from vetted local contractors and return options to you.
              </p>
            </>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#estimate" className="landing-btn-primary-lg">
              Get my free estimate →
            </a>
            <a href="#house" className="landing-btn-ghost">
              Pick a spot on the house
            </a>
          </div>

          <p className="mt-4 text-xs font-medium text-ink-40">
            Free to use · No obligation · DMV coverage · Ballpark + contractor bids
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {HERO_SERVICE_TAGS.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-ink-15 bg-white px-2.5 py-1 text-xs font-medium text-ink-70"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {!FIRST_JOB_MODE ? (
          <aside className="hidden lg:block" aria-label="Recent confirmed appointments">
            <div className="landing-card shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
              <div className="flex items-center justify-between border-b border-ink-15 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink-100">
                  <span className="landing-pulse" aria-hidden />
                  Recent appointments confirmed
                </div>
                <span className="text-xs font-medium text-ink-40">Today</span>
              </div>
              <p className="border-b border-ink-15 px-4 py-2 font-mono-landing text-[11px] text-ink-40">
                Last 24h · DMV · confirmed log
              </p>
              <ul className="divide-y divide-ink-15">
                {APPOINTMENT_LOG.map((row) => (
                  <li key={row.time} className="flex gap-3 px-4 py-3 text-sm">
                    <span className="shrink-0 font-mono-landing text-[11px] text-ink-40">{row.time}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-ink-100">{row.project}</p>
                      <p className="mt-0.5 font-mono-landing text-[11px] text-ink-40">{row.zip}</p>
                    </div>
                    {row.isNew && (
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                        title="New"
                        aria-label="New"
                      />
                    )}
                  </li>
                ))}
              </ul>
              <p className="border-t border-ink-15 px-4 py-2.5 font-mono-landing text-[10px] text-ink-40">
                Updated 09:14 EDT · Appointment data, not raw leads
              </p>
            </div>
          </aside>
        ) : (
          <aside className="hidden lg:block" aria-label="Start your estimate">
            <div className="landing-card p-6 shadow-[0_8px_24px_rgba(26,26,26,0.06)]">
              <p className="font-mono-landing text-xs uppercase tracking-wide text-ink-40">
                Estimate wizard
              </p>
              <p className="mt-3 text-lg font-semibold text-ink-100">
                Scope the job. See a ballpark. Request bids.
              </p>
              <p className="mt-2 text-sm text-ink-70">
                Trade-specific questions take a few minutes and produce a real planning range for
                the DMV — then an RFQ Renovessa can shop to contractors for you.
              </p>
              <a href="#estimate" className="landing-btn-primary mt-5 inline-flex">
                Start estimate →
              </a>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
