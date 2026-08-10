import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { JsonLd } from "@/components/JsonLd";
import { absoluteUrl } from "@/lib/seo";
import type { SolarFlags } from "@/lib/feature-flags";

/**
 * /solar — the landing page.
 *
 * Built around the solar decision process rather than SEO filler: each section
 * answers one of the questions a homeowner actually has, in the order they
 * have them. Every claim is either about what the tool does or is explicitly
 * hedged; no savings promises, no "your roof is perfect", no incentive claims.
 */

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "How accurate is this solar estimate?",
    a: "The roof geometry and sunlight come from aerial analysis of your actual property, and production is modelled by up to two independent models that we cross-check against each other. That makes it a good planning estimate. It is not a measurement: shade from a specific tree, your roof's structural condition, and your electrical panel all need a site visit.",
  },
  {
    q: "Is this an installer quote?",
    a: "No. It is a planning estimate. Only a licensed installer who has surveyed your roof and electrical service can give you a quote. This tool exists to get you to that conversation already knowing what you're asking for.",
  },
  {
    q: "How do you know where panels can go?",
    a: "Candidate panel positions come from the geospatial provider's roof model, which works from aerial imagery of your roof planes. We select from those positions; we never invent one. If your property isn't in the dataset, we say so and let you describe your roof instead.",
  },
  {
    q: "What if my roof isn't available in satellite data?",
    a: "You can describe your roof faces — which way they slope, how steep, roughly how big — and we still model production from those answers. The result is marked preliminary, because it isn't measured data.",
  },
  {
    q: "Does Renovessa install solar?",
    a: "No. Renovessa is not a solar installer and does not sell equipment. We help you plan the project and then connect it to qualified installers who quote it.",
  },
  {
    q: "Does the panel layout account for fire setbacks?",
    a: "No. The layout is conceptual. Fire-code setbacks, access pathways and any local amendments must be determined by your installer and the local authority having jurisdiction. We do not claim code compliance for any layout.",
  },
  {
    q: "Do I need a new roof first?",
    a: "It depends on your roof's age and condition, which we cannot assess from aerial imagery. If your roof is near the end of its life, most installers will recommend replacing it before mounting panels, because removing and reinstalling an array later is expensive. Tell us your roof's age and we'll flag it for the installer.",
  },
  {
    q: "Can I add battery storage?",
    a: "You can tell us you want it, and it will be in the brief installers quote from. Battery sizing itself isn't in this version of the planner — we'd rather record your goal accurately than produce a backup-duration number we can't stand behind.",
  },
  {
    q: "Does solar eliminate my utility bill?",
    a: "Usually not. Most utilities keep fixed monthly charges regardless of production, and your system won't produce exactly what you use in every hour. What solar changes is how much electricity you buy.",
  },
  {
    q: "Are incentives guaranteed?",
    a: "No. Incentive programs change, expire and have eligibility conditions. We only show programs where we hold a source, effective dates and a verification date — and if we can't verify anything for your area, we show nothing and say so rather than guessing.",
  },
  {
    q: "How is electricity production calculated?",
    a: "Two ways where possible. One uses the geospatial provider's per-panel sunlight model for your selected panels. The other runs NREL's PVWatts v8 model against each roof face separately, using that face's own tilt and orientation. We compare them: close agreement narrows the range, disagreement widens it and lowers the confidence.",
  },
  {
    q: "Can I change the proposed number of panels?",
    a: "Yes. Drag the slider, switch whole roof faces off, or click individual panels. System size, production, offset and cost all update as you do.",
  },
  {
    q: "Can I request actual proposals?",
    a: "Yes — that's the point. Your plan becomes a structured Solar Project Brief that installers can quote from, and you choose how many of them receive it.",
  },
];

export function SolarLandingPage({ flags }: { flags: SolarFlags }) {
  return (
    <>
      <SiteHeader />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Residential solar planning and installer matching",
          serviceType: "Solar panel installation planning",
          areaServed: "Washington DC–Maryland–Virginia metropolitan area",
          provider: { "@type": "Organization", name: "Renovessa", url: absoluteUrl("/") },
          url: absoluteUrl("/solar"),
        }}
      />

      <main className="landing-page min-h-screen bg-bone-0">
        {/* Hero */}
        <section className="border-b border-ink-15 bg-bone-1 px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <p className="landing-eyebrow">Residential Solar · DMV</p>
            <h1 className="landing-h1 mt-3 max-w-[18ch]">See what solar could look like on your roof</h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-ink-70">
              Enter your address to explore your roof&rsquo;s solar potential, visualise panels on it, estimate
              production and cost, and prepare a project installers can actually quote.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {flags.planner ? (
                <Link href="/solar/planner" className="landing-btn-primary-lg">
                  See my roof →
                </Link>
              ) : (
                <span className="landing-btn-primary-lg cursor-not-allowed opacity-60">Planner coming soon</span>
              )}
              <Link href="/solar/methodology" className="landing-btn-ghost">
                How solar estimates work
              </Link>
            </div>
            <p className="mt-6 max-w-2xl text-xs leading-relaxed text-ink-40">
              Free planning tool. No obligation. Estimates are planning estimates — not installer proposals or
              engineering designs. Your details are not distributed to installers unless you ask us to.
            </p>
          </div>
        </section>

        {/* What the tool actually does, in the order a homeowner asks it */}
        <section className="px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <h2 className="landing-h2">From an address to a project installers can quote</h2>
            <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  n: "1",
                  t: "Your actual property",
                  d: "We look up your building's roof planes, their orientation, pitch and measured sunlight — then ask you to confirm we found the right house.",
                },
                {
                  n: "2",
                  t: "Panels on your roof",
                  d: "See a conceptual array on your real roof geometry. Add panels, remove them, or switch a whole roof face off.",
                },
                {
                  n: "3",
                  t: "Production and offset",
                  d: "Two independent models estimate first-year output. Add your usage and we'll show what share of it this covers.",
                },
                {
                  n: "4",
                  t: "A brief, then proposals",
                  d: "Everything becomes a structured project brief — including what still needs verifying — that installers quote from.",
                },
              ].map((s) => (
                <li key={s.n} className="landing-card p-5">
                  <span className="landing-eyebrow">{s.n}</span>
                  <h3 className="mt-2 font-semibold text-ink-100">{s.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-70">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Understanding your roof */}
        <section className="bg-bone-1 px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <h2 className="landing-h2">Understanding your roof</h2>
            <p className="mt-4 max-w-3xl leading-relaxed text-ink-70">
              A roof isn&rsquo;t one surface — it&rsquo;s several planes, each with its own direction, slope and
              amount of sun. Those differences are most of what decides whether solar is worth it, and they&rsquo;re
              why a single national &ldquo;cost per watt&rdquo; number tells you so little about your house.
            </p>
            <dl className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Roof faces", "Each distinct plane of your roof is analysed separately, because each one performs differently."],
                ["Orientation", "Which compass direction a face slopes toward. In the DMV, south-facing faces generally produce most."],
                ["Pitch", "How steep the face is. Steeper roofs also cost more to work on safely."],
                ["Sunlight", "Measured annual sunshine hours across each face, which already reflects shading from nearby objects."],
                ["Usable area", "Not all roof area can carry panels — obstructions, setbacks and access pathways all take space."],
                ["Imagery age", "We show you when the aerial imagery was captured, because a lot can change in three years."],
              ].map(([term, def]) => (
                <div key={term}>
                  <dt className="font-semibold text-ink-100">{term}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-ink-70">{def}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Honest sections about the hard parts */}
        <section className="px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-5xl grid gap-8 lg:grid-cols-2">
            <article>
              <h2 className="text-xl font-semibold text-ink-100">Why your electricity bill matters</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-70">
                Production tells you what a system could make. Your usage tells you what that&rsquo;s worth. Without
                it we can still show your roof, system size and production — we just won&rsquo;t show an offset
                percentage, because the denominator would be a guess. Twelve months of actual kilowatt-hours from your
                bills is the single highest-value thing you can give us.
              </p>
            </article>

            <article>
              <h2 className="text-xl font-semibold text-ink-100">What drives the cost</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-70">
                System size dominates, but roof steepness, how many separate planes the array spans, your main
                electrical panel&rsquo;s capacity, and local permitting all move the number. We show every line and
                say whether it came from your roof data, from something you told us, or from a stated allowance.
              </p>
            </article>

            <article>
              <h2 className="text-xl font-semibold text-ink-100">Solar economics, honestly</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-70">
                What you save depends on when you use electricity, how your utility compensates exported energy, fixed
                charges that don&rsquo;t go away, your rate plan, panel degradation, future rate changes and how you
                finance it. We won&rsquo;t multiply production by today&rsquo;s rate and call it guaranteed savings.
              </p>
            </article>

            <article>
              <h2 className="text-xl font-semibold text-ink-100">Incentives and utility programs</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-70">
                We only show incentive programs where we hold a source, effective and expiry dates, and a verification
                date. If we can&rsquo;t verify anything applicable to your area, we show nothing and say so — an
                expired credit resurrected by marketing copy is worse than no number at all.
              </p>
            </article>

            <article>
              <h2 className="text-xl font-semibold text-ink-100">Permitting and interconnection</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-70">
                Solar generally involves local permitting, inspection, a utility interconnection application and
                permission to operate before the system can run. The exact requirements depend on your jurisdiction
                and utility, and we don&rsquo;t claim to know them for your address — your installer does.
              </p>
            </article>

            <article>
              <h2 className="text-xl font-semibold text-ink-100">Your roof&rsquo;s condition</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-70">
                If your roof needs replacing in a few years, that usually changes the decision, because removing and
                reinstalling an array is expensive. We ask about roof age and material and pass your answers to the
                installer. We do not diagnose roof condition from aerial imagery.
              </p>
            </article>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-bone-1 px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="landing-h2">Questions homeowners ask</h2>
            <dl className="mt-8 space-y-6">
              {FAQS.map((f) => (
                <div key={f.q} className="border-b border-ink-15 pb-6 last:border-0">
                  <dt className="font-semibold text-ink-100">{f.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-ink-70">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-5xl rounded-xl bg-ink-100 p-7 text-bone-0 sm:p-10">
            <h2 className="text-3xl" style={{ fontFamily: "var(--font-serif)" }}>
              Start with your address
            </h2>
            <p className="mt-3 max-w-2xl text-bone-1">
              No account needed. Your progress saves as you go, and nothing reaches an installer until you decide it
              should.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {flags.planner && (
                <Link href="/solar/planner" className="landing-btn-primary-lg">
                  See my roof →
                </Link>
              )}
              <Link
                href="/solar/methodology"
                className="inline-flex items-center justify-center rounded-lg border border-bone-1/40 px-6 py-3.5 text-base font-semibold text-bone-0 transition hover:border-bone-0"
              >
                Read the methodology
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
