import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PublicPage, InfoCard } from "@/components/marketing/PublicPage";
import { pageMetadata } from "@/lib/seo";
import { solarLandingEnabled } from "@/lib/feature-flags";
import { providerAvailabilityReport, getProductionModelProvider } from "@/lib/solar/providers";
import { resolvePricingConfig } from "@/lib/solar/config-loader";
import { calculationVersionSnapshot } from "@/lib/solar/versions";
import { DEFAULT_AGREEMENT_THRESHOLDS } from "@/lib/solar/production";

export const metadata: Metadata = pageMetadata({
  title: "Solar Estimate Methodology",
  description:
    "How Renovessa's solar planner derives roof geometry, models production, estimates cost, handles incentives, scores confidence, and where AI is and is not used.",
  path: "/solar/methodology",
});

/**
 * Public methodology page (§53, §54).
 *
 * Reports live provider availability and the active configuration versions
 * rather than a static description, so the page can't drift from the system.
 */
/**
 * Per request: this page reports live provider availability and the active
 * configuration versions, so a prerendered copy would go stale silently.
 */
export const dynamic = "force-dynamic";

export default async function SolarMethodologyPage() {
  if (!solarLandingEnabled()) notFound();

  const providers = providerAvailabilityReport();
  // Name the model that is actually running, not the one we happen to prefer:
  // this page's whole purpose is that it cannot drift from the system.
  const secondModel = getProductionModelProvider();
  const secondModelLabel = secondModel?.availability.label ?? "no second model (currently unavailable)";
  const { config } = await resolvePricingConfig();
  const versions = calculationVersionSnapshot();
  const t = config.production.agreementThresholds ?? DEFAULT_AGREEMENT_THRESHOLDS;

  return (
    <PublicPage
      eyebrow="Methodology"
      title="How our solar estimates are produced"
      intro="Every number in the solar planner comes from an authoritative source, a deterministic calculation, or an explicitly labelled assumption. This page explains which is which, and what we deliberately do not claim to know."
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Solar", href: "/solar" },
        { label: "Methodology" },
      ]}
    >
      <div className="space-y-10">
        <section>
          <h2 className="landing-h2">The rule we build to</h2>
          <p className="mt-4 leading-relaxed text-ink-70">
            Use AI to understand, organise and explain. Use authoritative data to know. Use deterministic models to
            calculate. Use you to confirm. Use qualified installers to verify and quote. Where a trustworthy answer
            isn&rsquo;t available, we say so and give you the best next step instead of inventing one.
          </p>
        </section>

        <section>
          <h2 className="landing-h2">Roof data</h2>
          <p className="mt-4 leading-relaxed text-ink-70">
            After geocoding your address we ask a geospatial provider for the building closest to that point. It
            returns the roof&rsquo;s distinct planes with their pitch, compass orientation, area and measured annual
            sunshine, plus candidate panel positions and the module dimensions its layout model used. We normalise
            those into our own representation and never assume a panel wattage — the wattage comes from the provider
            or from a specific module you select.
          </p>
          <p className="mt-3 leading-relaxed text-ink-70">
            We always ask you to confirm the building before analysing it, because a geocode can land on a neighbour,
            a garage or an apartment block. We show you when the aerial imagery was captured. If your property
            isn&rsquo;t covered, the lookup fails, or you tell us we found the wrong building, you can describe your
            roof faces yourself — production is still modelled, and the result is marked preliminary.
          </p>
        </section>

        <section>
          <h2 className="landing-h2">Panel placement</h2>
          <p className="mt-4 leading-relaxed text-ink-70">
            We select from the provider&rsquo;s candidate positions using a stable, deterministic ranking — highest
            modelled output first, with ties broken by roof face and position so the same inputs always give the same
            layout. We never generate a panel position ourselves.
          </p>
          <p className="mt-3 leading-relaxed text-ink-70">
            <strong className="text-ink-100">This is a conceptual layout, not an engineered plan.</strong> Final panel
            placement, fire-code setbacks, access pathways, structural requirements and code compliance must be
            verified by your installer and the local authority having jurisdiction. We do not claim any layout meets
            code.
          </p>
        </section>

        <section>
          <h2 className="landing-h2">Production modelling</h2>
          <p className="mt-4 leading-relaxed text-ink-70">
            Where both are available we run two independent models and compare them:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-ink-70">
            <li>
              <strong className="text-ink-100">Model A</strong> sums the geospatial provider&rsquo;s modelled DC output
              for each panel you&rsquo;ve selected, then converts it to AC using an assumed{" "}
              {(config.production.dcToAcDerate * 100).toFixed(0)}% DC-to-AC ratio so it&rsquo;s comparable.
            </li>
            <li>
              <strong className="text-ink-100">Model B</strong> runs {secondModelLabel} against each roof face
              separately, using that face&rsquo;s own tilt and orientation at {config.production.systemLossesPercent}%
              system losses, then aggregates. We never send an averaged tilt or orientation, because averaging
              materially different roof planes loses real accuracy.
            </li>
          </ul>
          <p className="mt-4 leading-relaxed text-ink-70">
            We do not pick whichever number is larger. We measure the difference between them as a percentage of their
            mean and respond to it:
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink-15 text-left text-xs uppercase tracking-wide text-ink-40">
                  <th scope="col" className="py-2 pr-4 font-medium">Difference</th>
                  <th scope="col" className="py-2 font-medium">What we do</th>
                </tr>
              </thead>
              <tbody className="text-ink-70">
                <tr className="border-b border-ink-15/60">
                  <td className="py-2 pr-4">Under {t.highPercent}%</td>
                  <td className="py-2">Close agreement — narrow range around the midpoint.</td>
                </tr>
                <tr className="border-b border-ink-15/60">
                  <td className="py-2 pr-4">{t.highPercent}–{t.normalPercent}%</td>
                  <td className="py-2">Normal modelling variance — range spans both models.</td>
                </tr>
                <tr className="border-b border-ink-15/60">
                  <td className="py-2 pr-4">{t.normalPercent}–{t.moderatePercent}%</td>
                  <td className="py-2">Moderate uncertainty — range spans both models, production confidence drops.</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Over {t.moderatePercent}%</td>
                  <td className="py-2">
                    Range widened beyond both models, confidence set to preliminary, and the discrepancy logged for
                    review.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-40">
            These thresholds are product rules, not scientific constants. They are configurable and are calibrated
            against real outcomes over time. If only one model is available we use it with a deliberately wider range;
            if neither succeeds we show no production figure at all.
          </p>
        </section>

        <section>
          <h2 className="landing-h2">Your electricity use</h2>
          <p className="mt-4 leading-relaxed text-ink-70">
            We use the best input you give us, in this order: twelve months of actual kWh; a utility-stated annual
            total; partial months scaled to a year (labelled as an extrapolation); an annual figure you enter; a single
            month treated as typical; and last, an approximation from your bill dollars — which we will only calculate
            with an electricity rate you supply, and which we always label as an approximation.
          </p>
          <p className="mt-3 leading-relaxed text-ink-70">
            If you give us none of those, we produce no usage figure and no offset percentage. We do not substitute a
            national average.
          </p>
        </section>

        <section>
          <h2 className="landing-h2">Cost</h2>
          <p className="mt-4 leading-relaxed text-ink-70">
            Pricing is deterministic. AI never sets a price. The engine multiplies your system&rsquo;s watts by a
            dollars-per-watt band for its size, then adds line items whose triggers are objective — steep or
            multi-plane roofs come from your roof geometry, electrical work comes from what you told us, and permitting
            is an explicitly labelled allowance. Nothing is added because something &ldquo;looked like&rdquo; it
            applied.
          </p>
          <div className="mt-4 rounded-lg border border-ink-15 bg-bone-1 p-4 text-sm leading-relaxed text-ink-70">
            <strong className="text-ink-100">Current pricing status:</strong> the active configuration is{" "}
            <code className="font-mono-landing">{config.version}</code> for {config.market}, based on{" "}
            {config.sampleCount === 0
              ? "no local proposal data yet"
              : `${config.sampleCount} comparable local project${config.sampleCount === 1 ? "" : "s"}`}
            .{" "}
            {config.dataBasis === "unvalidated_planning_default"
              ? "Because that is not local market evidence, dollar figures are withheld from the planner until a reviewed local pricing model is published. Everything else — roof analysis, system size, production, offset — still works."
              : "Dollar figures shown are planning ranges, not quotes."}
          </div>
        </section>

        <section>
          <h2 className="landing-h2">Incentives</h2>
          <p className="mt-4 leading-relaxed text-ink-70">
            We display an incentive only when we hold its source, jurisdiction, effective and expiry dates, eligibility
            summary and a verification date, and only when its jurisdiction actually matches your project. Programs
            whose verification has gone stale are withheld rather than shown. Programs whose eligibility hasn&rsquo;t
            been established for your project are listed but never subtracted from a cost.
          </p>
          <p className="mt-3 leading-relaxed text-ink-70">
            We do not hard-code federal tax assumptions. Anything shown is planning information, not tax advice —
            verify eligibility with the program administrator or a tax professional before relying on it.
          </p>
        </section>

        <section>
          <h2 className="landing-h2">Confidence</h2>
          <p className="mt-4 leading-relaxed text-ink-70">
            We score five things separately — roof data, electricity use, production modelling, cost and incentives —
            and report the weakest of the first four as your overall planning confidence. Each dimension explains
            itself and, where possible, tells you exactly what would improve it.
          </p>
        </section>

        <section>
          <h2 className="landing-h2">Where AI is used</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <InfoCard title="AI may">
              <ul className="list-disc space-y-1 pl-4">
                <li>Read structured values out of a document you upload, as a draft for you to confirm</li>
                <li>Turn a free-text description into candidate answers for you to confirm</li>
                <li>Suggest what a photo appears to show, for you to confirm</li>
                <li>Explain results that were calculated deterministically</li>
                <li>Point out information that&rsquo;s missing or contradictory</li>
              </ul>
            </InfoCard>
            <InfoCard title="AI never">
              <ul className="list-disc space-y-1 pl-4">
                <li>Determines roof dimensions, pitch, orientation or sunlight</li>
                <li>Invents panel counts or positions</li>
                <li>Calculates energy production</li>
                <li>Sets prices or invents incentives</li>
                <li>Determines permit requirements or code compliance</li>
                <li>Assesses structural adequacy or roof condition</li>
                <li>Judges contractor licensing or availability</li>
              </ul>
            </InfoCard>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink-40">
            The current release of the solar planner uses no AI at all in the estimate path.
          </p>
        </section>

        <section>
          <h2 className="landing-h2">Data sources in use right now</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink-15 text-left text-xs uppercase tracking-wide text-ink-40">
                  <th scope="col" className="py-2 pr-4 font-medium">Source</th>
                  <th scope="col" className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="text-ink-70">
                {providers.map((p) => (
                  <tr key={p.id} className="border-b border-ink-15/60">
                    <td className="py-2 pr-4 text-ink-100">{p.label}</td>
                    <td className="py-2">
                      {p.configured ? "Active" : `Not active — ${p.reason ?? "unavailable"}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-ink-40">
            Independent production modelling currently uses {secondModelLabel}. Utility rate data, where available,
            comes from the OpenEI Utility Rate Database. Roof analysis and aerial imagery use Google Maps Platform.
          </p>
        </section>

        <section>
          <h2 className="landing-h2">What we do not determine</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-ink-70">
            <li>Whether your roof can structurally carry an array</li>
            <li>Your roof&rsquo;s condition or remaining service life</li>
            <li>Fire-code setbacks, access pathways or any code compliance</li>
            <li>Your main panel&rsquo;s capacity or the interconnection method</li>
            <li>Permit requirements or fees for your jurisdiction</li>
            <li>Your final production, your final price, or your savings</li>
          </ul>
          <p className="mt-4 leading-relaxed text-ink-70">
            All of these need a licensed installer on your roof. That&rsquo;s what the project brief is for.
          </p>
        </section>

        <section>
          <h2 className="landing-h2">Version record</h2>
          <p className="mt-4 leading-relaxed text-ink-70">
            Every estimate is stored with the exact calculation versions and the input snapshot that produced it, so a
            result you saw last month stays explainable after we change the rules.
          </p>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            {Object.entries({
              "Layout engine": versions.layout,
              "Production model": versions.production,
              "Consumption model": versions.consumption,
              "Cost engine": versions.cost,
              "Confidence model": versions.confidence,
              "Pricing configuration": config.version,
            }).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="text-ink-40">{k}:</dt>
                <dd className="font-mono-landing text-ink-70">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="text-sm text-ink-40">
          Questions about any of this? <Link href="/contact" className="underline">Get in touch</Link>. See also our{" "}
          <Link href="/methodology/estimate-methodology" className="underline">
            general estimate methodology
          </Link>
          .
        </p>
      </div>
    </PublicPage>
  );
}
