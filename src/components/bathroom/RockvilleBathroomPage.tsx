import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { absoluteUrl } from "@/lib/seo";
import { RockvilleCostGuide, RockvillePermitPreview, RockvilleFaq, RockvilleMethodology } from "./sections";

export type BathroomFlags = {
  landing: boolean;
  planner: boolean;
  diagramBuilder: boolean;
  aiInterpretation: boolean;
  estimator: boolean;
  permitNavigator: boolean;
  projectBrief: boolean;
  contractorMatching: boolean;
  proposalComparison: boolean;
  demoMode: boolean;
};

export function RockvilleBathroomPage({ flags }: { flags: BathroomFlags }) {
  return (
    <>
      <SiteHeader />
      <main className="landing-page min-h-screen bg-bone-0">
        {/* 1. Hero and value proposition */}
        <section className="border-b border-ink-15 bg-bone-1 px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-5xl">
            <p className="landing-eyebrow">Bathroom Remodeling · Rockville, MD</p>
            <h1 className="landing-h1 mt-3 max-w-[22ch]">
              Plan Your Rockville Bathroom Remodel Before Requesting Contractor Bids
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-ink-70">
              Measure your bathroom, explore layout changes, select materials, receive a localized planning range,
              and create a detailed project brief for qualified Rockville-area contractors.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {flags.planner ? (
                <Link href="/bathroom-remodeling/rockville-md/planner" className="landing-btn-primary-lg">
                  Design and Estimate My Bathroom →
                </Link>
              ) : (
                <span className="landing-btn-primary-lg opacity-60 cursor-not-allowed">
                  Planner coming soon
                </span>
              )}
              <Link href="/bathroom-remodeling/rockville-md/cost" className="landing-btn-ghost">
                Explore Rockville Bathroom Costs
              </Link>
            </div>
            <p className="mt-5 text-xs leading-relaxed text-ink-40">
              Free planning tool. No obligation. Your details are not automatically distributed to multiple contractors.
            </p>
          </div>
        </section>

        {/* 2. Planner entry point + 3. Interactive estimate preview */}
        {flags.planner && (
          <section className="px-4 py-12 sm:px-6">
            <div className="mx-auto max-w-5xl">
              <div className="landing-card p-6 sm:p-8">
                <h2 className="text-2xl font-semibold text-ink-100">Start your bathroom plan</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-70">
                  Choose Quick Estimate for a fast planning range, or Detailed Project Planner to capture the full scope.
                  You can switch between modes without losing data.
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Link href="/bathroom-remodeling/rockville-md/planner?mode=quick" className="landing-card p-5 transition hover:border-ink-40">
                    <h3 className="font-semibold text-ink-100">Quick Estimate</h3>
                    <p className="mt-1 text-sm text-ink-70">Bathroom type, size, finish tier, and a planning range in minutes.</p>
                  </Link>
                  <Link href="/bathroom-remodeling/rockville-md/planner?mode=detailed" className="landing-card p-5 transition hover:border-ink-40">
                    <h3 className="font-semibold text-ink-100">Detailed Project Planner</h3>
                    <p className="mt-1 text-sm text-ink-70">Measurements, layout, fixtures, finishes, conditions, permits, and a contractor-ready brief.</p>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 4. Existing and proposed diagram preview */}
        {flags.diagramBuilder && (
          <section className="px-4 py-12 sm:px-6 bg-bone-1">
            <div className="mx-auto max-w-5xl">
              <h2 className="landing-h2">Draw your existing and proposed layouts</h2>
              <p className="mt-3 max-w-3xl text-ink-70">
                A 2D diagram builder helps you record the current bathroom and explore a proposed layout. The diagram
                engine calculates floor area, perimeter, paintable wall area, wet-wall area, tile area, and baseboard
                length automatically.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="landing-card p-5">
                  <h3 className="font-semibold text-ink-100">Existing layout</h3>
                  <p className="mt-1 text-sm text-ink-70">Walls, doors, windows, fixtures, plumbing, and electrical reference points.</p>
                </div>
                <div className="landing-card p-5">
                  <h3 className="font-semibold text-ink-100">Proposed layout</h3>
                  <p className="mt-1 text-sm text-ink-70">Relocate fixtures, resize the shower, add a bench or niche, switch to a double vanity.</p>
                </div>
              </div>
              <p className="mt-4 text-xs text-ink-40">
                Conceptual planning diagram only. Not an architectural, engineering, construction, or permit drawing.
              </p>
            </div>
          </section>
        )}

        {/* 5. How Renovessa works */}
        <section className="px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <h2 className="landing-h2">How Renovessa works</h2>
            <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 list-none">
              {[
                { n: "1", t: "Describe the bathroom", d: "Bathroom type, age, current usability, and users." },
                { n: "2", t: "Measure and draw", d: "Simple dimensions, guided wall-by-wall, or upload an existing plan." },
                { n: "3", t: "Select finishes", d: "Shower, vanity, flooring, tile, fixtures, and accessibility features." },
                { n: "4", t: "Get a planning range", d: "A localized Rockville estimate with cost drivers and confidence." },
              ].map((s) => (
                <li key={s.n} className="landing-card p-5">
                  <p className="font-mono-landing text-xs text-ink-40">Step {s.n}</p>
                  <h3 className="mt-2 font-semibold text-ink-100">{s.t}</h3>
                  <p className="mt-1 text-sm text-ink-70">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 6. Cost guide */}
        <RockvilleCostGuide />

        {/* 7. Permit navigator preview */}
        {flags.permitNavigator && <RockvillePermitPreview />}

        {/* 8. Contractor verification */}
        <section className="px-4 py-12 sm:px-6 bg-bone-1">
          <div className="mx-auto max-w-5xl">
            <h2 className="landing-h2">Contractor verification</h2>
            <p className="mt-3 max-w-3xl text-ink-70">
              Renovessa records MHIC license status, insurance status, and the last verification date for each
              contractor. Credential status may change; homeowners should confirm official records before signing.
              Contractors are independent businesses.
            </p>
          </div>
        </section>

        {/* 9. Process guide + 10. Material guidance + 11. Accessibility */}
        <section className="px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-5xl grid gap-5 md:grid-cols-3">
            <div className="landing-card p-5">
              <h3 className="font-semibold text-ink-100">Remodeling process</h3>
              <p className="mt-1 text-sm text-ink-70">Plan, demo, rough-in, waterproofing, finishes, and closeout — what to expect at each stage.</p>
              <Link href="/bathroom-remodeling/rockville-md/planning-guide" className="mt-3 inline-block text-sm font-medium text-accent">Read the guide →</Link>
            </div>
            <div className="landing-card p-5">
              <h3 className="font-semibold text-ink-100">Material and fixture guidance</h3>
              <p className="mt-1 text-sm text-ink-70">Tile, vanity, countertop, lighting, and ventilation choices and their cost impact.</p>
            </div>
            <div className="landing-card p-5">
              <h3 className="font-semibold text-ink-100">Accessibility guidance</h3>
              <p className="mt-1 text-sm text-ink-70">Curbless showers, grab bars, comfort-height toilets, and aging-in-place modifications.</p>
              <Link href="/bathroom-remodeling/rockville-md/accessible-bathrooms" className="mt-3 inline-block text-sm font-medium text-accent">Accessible bathrooms →</Link>
            </div>
          </div>
        </section>

        {/* 12. Illustrative scenarios */}
        <section className="px-4 py-12 sm:px-6 bg-bone-1">
          <div className="mx-auto max-w-5xl">
            <h2 className="landing-h2">Illustrative project scenarios</h2>
            <p className="mt-3 max-w-3xl text-ink-70">
              These are illustrative scenarios based on stated assumptions — not real projects, testimonials, or
              completed jobs. They show how the planner organizes a project.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { t: "Powder-room refresh", d: "Cosmetic refresh, ~20 sq ft, stock vanity, paint, hardware." },
                { t: "Guest bath remodel", d: "Same layout, new tile, vanity, toilet, lighting. ~40 sq ft." },
                { t: "Tub-to-shower conversion", d: "Remove alcove tub, custom tiled curbless shower, glass enclosure." },
              ].map((s) => (
                <article key={s.t} className="landing-card p-5">
                  <h3 className="font-semibold text-ink-100">{s.t}</h3>
                  <p className="mt-1 text-sm text-ink-70">{s.d}</p>
                  <p className="mt-3 text-xs text-ink-40">Illustrative project scenario based on stated assumptions.</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 13. FAQ */}
        <RockvilleFaq />

        {/* 14. Final planner CTA */}
        <section className="px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-5xl rounded-xl bg-ink-100 p-7 text-bone-0 sm:p-9">
            <h2 className="font-serif-landing text-3xl">Ready to plan your Rockville bathroom?</h2>
            <p className="mt-3 max-w-2xl text-bone-1">
              Build a structured scope, see a localized planning range, and create a contractor-ready brief —
              before you talk to any contractor.
            </p>
            {flags.planner && (
              <Link href="/bathroom-remodeling/rockville-md/planner" className="landing-btn-primary-lg mt-6">
                Design and Estimate My Bathroom →
              </Link>
            )}
          </div>
        </section>

        {/* 15. Methodology */}
        <RockvilleMethodology />
      </main>
      <SiteFooter />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Rockville bathroom remodeling planner",
          serviceType: "Bathroom remodeling project planning and request-for-quote coordination",
          provider: { "@type": "Organization", name: "Renovessa", url: absoluteUrl("/") },
          areaServed: "Rockville, MD",
          url: absoluteUrl("/bathroom-remodeling/rockville-md"),
        }}
      />
    </>
  );
}
