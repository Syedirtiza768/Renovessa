import { APPOINTMENT_LOG, HERO_SERVICE_TAGS } from "@/lib/landing-data";

export function LandingHero() {
  return (
    <section className="bg-bone-0 px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
      <div className="mx-auto grid max-w-[1440px] gap-10 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)] lg:gap-12">
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-ink-40">
            <span className="flex items-center gap-2">
              <span className="landing-pulse" aria-hidden />
              Appointments live
            </span>
            <span className="hidden sm:inline" aria-hidden>
              |
            </span>
            <span>DMV · DC · MD · VA</span>
            <span className="hidden sm:inline" aria-hidden>
              |
            </span>
            <span>Est. 2024 · Verified Appointments Only</span>
          </div>

          <h1 className="landing-h1 mt-6 max-w-[18ch]">
            Tell Renovessa what <em className="font-serif-landing italic">needs</em> doing around the
            house.
          </h1>

          <p className="mt-5 max-w-[52ch] text-lg text-ink-70">
            Submit your project details and Renovessa will connect you with a vetted local
            contractor who handles that type of work — and confirm an actual appointment, not just
            send your number to five companies.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#request" className="landing-btn-primary-lg">
              Submit My Project Request →
            </a>
            <a href="#how" className="landing-btn-ghost">
              How it works
            </a>
          </div>

          <p className="mt-4 text-xs font-medium text-ink-40">
            Free to submit · No obligation · DMV coverage · One contractor, not five
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
      </div>
    </section>
  );
}
