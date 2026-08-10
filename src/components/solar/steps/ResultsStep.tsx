"use client";

/**
 * Results — the personalized solar feasibility report (§40–43).
 *
 * Layout follows §68: the roof canvas dominates, a metric strip sits beneath
 * it, then the detail panels. Every number carries its provenance, every
 * unavailable number says why it is unavailable rather than showing a zero,
 * and the primary CTA is the contractor RFP — not the estimate.
 */

import type { SolarPlanResult, RoofAnalysis } from "@/lib/solar/types";
import { Metric, WithheldMetric, WhyThisNumber } from "../WhyThisNumber";
import {
  formatKw,
  formatKwhPerYear,
  formatKwhRange,
  formatPercent,
  formatUsdRange,
  formatDollarsPerWatt,
  confidenceBadgeClass,
  MONTH_LABELS,
} from "@/lib/solar/formatters";
import { confidenceLabel } from "@/lib/solar/confidence";
import { consumptionBasisLabel } from "@/lib/solar/consumption";

export function ResultsStep({
  plan,
  analysis,
  onAdjust,
  onRequestProposals,
  briefState,
}: {
  plan: SolarPlanResult;
  analysis: RoofAnalysis | null;
  onAdjust: () => void;
  onRequestProposals: () => void;
  briefState: { generating: boolean; error: string | null };
}) {
  const production = plan.production;
  const cost = plan.cost;

  return (
    <div className="space-y-10">
      {/* --- Metric strip ------------------------------------------------ */}
      <section aria-labelledby="solar-headline">
        <h2 id="solar-headline" className="landing-h2">
          Your solar plan
        </h2>

        <div className="mt-6 grid grid-cols-2 gap-6 border-y border-ink-15 py-6 sm:grid-cols-3 lg:grid-cols-5">
          <Metric
            label="Proposed system"
            value={formatKw(plan.system.dcSystemSizeKw.value)}
            sub="Rated solar-panel capacity"
            tracked={plan.system.dcSystemSizeKw}
            emphasis
          />
          <Metric
            label="Panels"
            value={String(plan.system.panelCount.value)}
            sub={`${Math.round(plan.roofUsage.percentOfSuitableRoofUsed)}% of your suitable roof`}
            tracked={plan.system.panelCount}
          />
          {production.annualAcKwh ? (
            <Metric
              label="First-year production"
              value={formatKwhPerYear(production.annualAcKwh.value)}
              sub={
                production.rangeLowKwh && production.rangeHighKwh
                  ? `Range ${formatKwhRange(production.rangeLowKwh.value, production.rangeHighKwh.value)}`
                  : undefined
              }
              tracked={production.annualAcKwh}
              emphasis
            />
          ) : (
            <WithheldMetric
              label="First-year production"
              reason="No production model succeeded for this property."
            />
          )}
          {plan.offsetPercent ? (
            <Metric
              label="Electricity offset"
              value={formatPercent(plan.offsetPercent.value)}
              sub="Of your estimated annual use"
              tracked={plan.offsetPercent}
            />
          ) : (
            <WithheldMetric
              label="Electricity offset"
              reason="Add your electricity usage and we'll show what share this covers."
            />
          )}
          <div className="flex flex-col gap-1 border-l border-ink-15 pl-4">
            <span className="landing-eyebrow">Planning confidence</span>
            <span
              className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-sm font-medium ${confidenceBadgeClass(
                plan.confidence.overall,
              )}`}
            >
              {confidenceLabel(plan.confidence.overall)}
            </span>
            <span className="text-xs leading-snug text-ink-40">
              {plan.confidence.dimensions.find((d) => d.level === plan.confidence.overall)?.reasons[0] ?? ""}
            </span>
          </div>
        </div>
      </section>

      {/* --- Cost -------------------------------------------------------- */}
      <section aria-labelledby="solar-cost">
        <h3 id="solar-cost" className="text-lg font-semibold text-ink-100">
          Project cost
        </h3>

        {cost.displayable ? (
          <>
            <p className="mt-3 text-3xl text-ink-100" style={{ fontFamily: "var(--font-serif)" }}>
              {formatUsdRange(cost.installedCostLow, cost.installedCostHigh)}
            </p>
            <p className="mt-1 text-sm text-ink-40">
              About {formatDollarsPerWatt(cost.dollarsPerWattLow)}–{formatDollarsPerWatt(cost.dollarsPerWattHigh)}{" "}
              installed. Planning range, not a quote.
            </p>

            <table className="mt-5 w-full border-collapse text-sm">
              <caption className="sr-only">Cost breakdown by line item</caption>
              <thead>
                <tr className="border-b border-ink-15 text-left text-xs uppercase tracking-wide text-ink-40">
                  <th scope="col" className="py-2 pr-3 font-medium">Item</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Basis</th>
                  <th scope="col" className="py-2 text-right font-medium">Range</th>
                </tr>
              </thead>
              <tbody>
                {cost.lineItems.map((li) => (
                  <tr key={`${li.category}-${li.sortOrder}`} className="border-b border-ink-15/60">
                    <th scope="row" className="py-2 pr-3 text-left font-normal text-ink-100">
                      {li.description}
                      {li.triggerBasis === "assumption" && (
                        <span className="ml-2 rounded-full bg-ink-5 px-2 py-0.5 text-xs text-ink-40">allowance</span>
                      )}
                    </th>
                    <td className="py-2 pr-3 text-xs text-ink-40">{li.calculationReference}</td>
                    <td className="py-2 text-right text-ink-70">
                      {formatUsdRange(li.lowAmount, li.highAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {cost.netCostLow !== null && cost.netCostHigh !== null ? (
              <p className="mt-4 text-sm text-ink-70">
                After verified incentives: {formatUsdRange(cost.netCostLow, cost.netCostHigh)}
              </p>
            ) : (
              <p className="mt-4 rounded-lg border border-ink-15 bg-bone-1 p-3 text-sm leading-relaxed text-ink-70">
                {cost.appliedIncentives.length > 0
                  ? "The programs listed for your area could not be converted into a verified upfront deduction, so no net cost is shown. The range above is gross installed cost — SREC income potential is shown separately below."
                  : "Incentive information could not currently be verified for your location, so none has been applied and no net cost is shown. The range above is gross installed cost."}
              </p>
            )}
          </>
        ) : (
          <div className="mt-3 rounded-lg border border-ink-15 bg-bone-1 p-4">
            <p className="text-sm leading-relaxed text-ink-100">
              We&rsquo;re not showing a cost range for your area yet.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-70">
              {cost.withheldReason} We&rsquo;d rather show you nothing than a national average dressed up as a local
              price. Your roof analysis, system size and production estimate above are unaffected, and installers can
              quote your actual project from the brief.
            </p>
          </div>
        )}
      </section>

      {/* --- SREC income projection (market-priced, not guaranteed) -------- */}
      {plan.srecIncome && (
        <section aria-labelledby="solar-srec">
          <h3 id="solar-srec" className="text-lg font-semibold text-ink-100">
            SREC income potential ({plan.srecIncome.stateCode})
          </h3>
          <p className="mt-3 text-2xl text-ink-100" style={{ fontFamily: "var(--font-serif)" }}>
            {formatUsdRange(
              plan.srecIncome.totalIncomeLowDollars.value,
              plan.srecIncome.totalIncomeHighDollars.value,
            )}{" "}
            <span className="text-base text-ink-40">over {plan.srecIncome.projectedYears} years</span>
          </p>
          <p className="mt-1 text-sm text-ink-40">
            About {plan.srecIncome.srecsPerYear.value} credits/year,{" "}
            {formatUsdRange(plan.srecIncome.annualIncomeLowDollars.value, plan.srecIncome.annualIncomeHighDollars.value)}{" "}
            per year at current market prices.
          </p>
          <p className="mt-2 inline-block rounded-full bg-ink-5 px-2 py-0.5 text-xs text-ink-40">
            Market-priced estimate — not guaranteed, not deducted from project cost
          </p>
          {plan.srecIncome.certifiedMultiplierNote && (
            <p className="mt-3 rounded-lg border border-accent bg-accent/5 p-3 text-sm leading-relaxed text-ink-70">
              {plan.srecIncome.certifiedMultiplierNote}
            </p>
          )}
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-relaxed text-ink-40">
            {plan.srecIncome.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>
      )}

      {/* --- Monthly production ------------------------------------------ */}
      {production.monthlyAcKwh && (
        <section aria-labelledby="solar-monthly">
          <h3 id="solar-monthly" className="text-lg font-semibold text-ink-100">
            Month by month
          </h3>
          <MonthlyChart monthly={production.monthlyAcKwh.value} />
          <WhyThisNumber tracked={production.monthlyAcKwh} label="monthly production" />
        </section>
      )}

      {/* --- Confidence detail -------------------------------------------- */}
      <section aria-labelledby="solar-confidence">
        <h3 id="solar-confidence" className="text-lg font-semibold text-ink-100">
          How confident is this plan?
        </h3>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {plan.confidence.dimensions.map((d) => (
            <div key={d.key} className="rounded-lg border border-ink-15 bg-white p-4">
              <dt className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-100">{d.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${confidenceBadgeClass(d.level)}`}
                >
                  {confidenceLabel(d.level)}
                </span>
              </dt>
              <dd className="mt-2 text-xs leading-relaxed text-ink-70">{d.reasons.join(" ")}</dd>
            </div>
          ))}
        </dl>

        {plan.confidence.topImprovements.length > 0 && (
          <div className="mt-5 rounded-lg border border-ink-15 bg-accent-100 p-4">
            <h4 className="text-sm font-semibold text-ink-100">Make this estimate better</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-70">
              {plan.confidence.topImprovements.map((imp) => (
                <li key={imp}>{imp}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* --- Assumptions -------------------------------------------------- */}
      <section aria-labelledby="solar-assumptions">
        <h3 id="solar-assumptions" className="text-lg font-semibold text-ink-100">
          What we assumed
        </h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-70">
          {[...production.assumptions, ...plan.consumption.assumptions, ...cost.assumptions].map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>

        <h4 className="mt-6 text-sm font-semibold text-ink-100">Your electricity use</h4>
        <p className="mt-1 text-sm text-ink-70">
          Basis: {consumptionBasisLabel(plan.consumption.basis)}
          {plan.consumption.annualKwh &&
            ` · ${Math.round(plan.consumption.annualKwh.value).toLocaleString()} kWh/year`}
        </p>

        {plan.consumption.anomalies.length > 0 && (
          <div className="mt-4 rounded-lg border border-ink-15 bg-bone-1 p-4">
            <h4 className="text-sm font-semibold text-ink-100">Please reconcile these</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-70">
              {plan.consumption.anomalies.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        )}

        <h4 className="mt-6 text-sm font-semibold text-ink-100">Not included in this estimate</h4>
        <ul className="mt-2 flex flex-wrap gap-2">
          {cost.exclusions.map((x) => (
            <li key={x} className="rounded-full bg-ink-5 px-3 py-1 text-xs text-ink-70">
              {x}
            </li>
          ))}
        </ul>
      </section>

      {/* --- Outstanding verification ------------------------------------- */}
      <section aria-labelledby="solar-verify">
        <h3 id="solar-verify" className="text-lg font-semibold text-ink-100">
          What an installer still needs to verify
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-70">
          This is a planning design, not an engineering plan. Everything below needs a site visit — and it all goes to
          the installer with your project brief so they can quote precisely.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {plan.outstandingVerification.map((v) => (
            <li key={v} className="flex gap-2 text-sm text-ink-70">
              <span aria-hidden className="text-ink-40">
                —
              </span>
              {v}
            </li>
          ))}
        </ul>
      </section>

      {/* --- CTA ----------------------------------------------------------- */}
      <section className="rounded-xl bg-ink-100 p-7 text-bone-0 sm:p-9">
        <h3 className="text-3xl" style={{ fontFamily: "var(--font-serif)" }}>
          Ready for real proposals?
        </h3>
        <p className="mt-3 max-w-2xl text-bone-1">
          We&rsquo;ll turn everything above into a structured Solar Project Brief — roof analysis, panel layout,
          production modelling, your usage, and the site-verification checklist — so qualified installers can quote
          your actual project instead of guessing.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onRequestProposals}
            disabled={briefState.generating}
            className="landing-btn-primary-lg disabled:opacity-60"
          >
            {briefState.generating ? "Preparing your brief…" : "Request solar proposals →"}
          </button>
          <button
            type="button"
            onClick={onAdjust}
            className="inline-flex items-center justify-center rounded-lg border border-bone-1/40 px-6 py-3.5 text-base font-semibold text-bone-0 transition hover:border-bone-0"
          >
            Adjust my system
          </button>
        </div>
        {briefState.error && <p className="mt-3 text-sm text-amber-200">{briefState.error}</p>}
        <p className="mt-5 text-xs leading-relaxed text-bone-1/70">
          You choose how many installers see this, and nothing is shared until you confirm.
        </p>
      </section>

      {analysis && (
        <p className="text-xs leading-relaxed text-ink-40">
          Roof data source: {analysis.isManual ? "described by you" : analysis.providerId}
          {analysis.imageryDate && ` · imagery captured ${analysis.imageryDate}`} · production modelled by{" "}
          {production.models.map((m) => m.modelId).join(" and ") || "no model"}. See our{" "}
          <a href="/solar/methodology" className="underline">
            methodology
          </a>
          .
        </p>
      )}
    </div>
  );
}

/** Simple, accessible bar chart. No chart library, no external requests. */
function MonthlyChart({ monthly }: { monthly: number[] }) {
  const max = Math.max(...monthly, 1);
  return (
    <div className="mt-4">
      <div className="flex h-40 items-end gap-1.5" role="presentation">
        {monthly.map((v, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-accent"
              style={{ height: `${Math.max(2, (v / max) * 100)}%` }}
              aria-hidden
            />
            <span className="text-[10px] text-ink-40">{MONTH_LABELS[i]}</span>
          </div>
        ))}
      </div>
      <table className="sr-only">
        <caption>Estimated monthly production in kilowatt-hours</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Estimated production (kWh)</th>
          </tr>
        </thead>
        <tbody>
          {monthly.map((v, i) => (
            <tr key={i}>
              <th scope="row">{MONTH_LABELS[i]}</th>
              <td>{Math.round(v).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
