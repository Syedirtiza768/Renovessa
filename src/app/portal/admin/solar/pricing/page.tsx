import { redirect } from "next/navigation";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { solarLandingEnabled } from "@/lib/feature-flags";
import { DEFAULT_SOLAR_PRICING_CONFIG } from "@/lib/solar/pricing-config";
import { providerAvailabilityReport } from "@/lib/solar/providers";

export const dynamic = "force-dynamic";

/**
 * Solar pricing + model configuration (§47).
 *
 * The important thing this screen communicates is the *gap* between having a
 * published configuration and having one homeowners can actually see: the
 * public dollar display is fail-closed on an exact version match with
 * NEXT_PUBLIC_APPROVED_SOLAR_PRICING_VERSION, so publishing alone is not
 * enough. That is deliberate, and the screen says so.
 */
export default async function SolarPricingAdminPage() {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) redirect("/login");
  if (!solarLandingEnabled()) redirect("/portal/admin");

  const configs = await prisma.solarEstimatorConfiguration.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 50,
  });

  const published = configs.find((c) => c.status === "PUBLISHED");
  const approvedVersion = process.env.NEXT_PUBLIC_APPROVED_SOLAR_PRICING_VERSION?.trim() || null;
  const activeVersion = published?.version ?? DEFAULT_SOLAR_PRICING_CONFIG.version;
  const displayingDollars = Boolean(approvedVersion && approvedVersion === activeVersion);
  const providers = providerAvailabilityReport();

  return (
    <div>
      <h1 className="text-2xl font-bold">Solar pricing &amp; model configuration</h1>
      <p className="mt-1 text-sm text-muted">
        Versioned pricing bands, adders, production-model settings and agreement thresholds. Every estimate stores the
        version that produced it, so changing these never rewrites history.
      </p>

      <div
        className={`mt-6 rounded-lg border p-4 ${
          displayingDollars ? "border-green-600 bg-green-50" : "border-amber-500 bg-amber-50"
        }`}
      >
        <p className={`text-sm font-semibold ${displayingDollars ? "text-green-800" : "text-amber-800"}`}>
          {displayingDollars
            ? "Homeowners are seeing cost ranges"
            : "Cost ranges are withheld from homeowners"}
        </p>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">Active configuration</dt>
            <dd className="font-mono text-xs">{activeVersion}</dd>
          </div>
          <div>
            <dt className="text-muted">Approved for display</dt>
            <dd className="font-mono text-xs">{approvedVersion ?? "not set"}</dd>
          </div>
          <div>
            <dt className="text-muted">Source of active config</dt>
            <dd>{published ? "Published row" : "Built-in planning default"}</dd>
          </div>
        </dl>
        {!displayingDollars && (
          <p className="mt-3 text-sm text-amber-700">
            To show dollar figures, publish a reviewed configuration and set{" "}
            <code className="font-mono text-xs">NEXT_PUBLIC_APPROVED_SOLAR_PRICING_VERSION</code> to its exact version,
            then redeploy. Everything else in the planner — roof analysis, system size, production, offset, the project
            brief — works regardless.
          </p>
        )}
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Built-in planning default</h2>
        <p className="mt-1 text-sm text-muted">
          Used when no configuration is published. It is <strong>not</strong> market data — {""}
          <code className="font-mono text-xs">{DEFAULT_SOLAR_PRICING_CONFIG.dataBasis}</code>, sample count{" "}
          {DEFAULT_SOLAR_PRICING_CONFIG.sampleCount}. Publish a reviewed configuration built from real proposals before
          exposing prices.
        </p>
        <div className="card mt-3 overflow-x-auto p-4">
          <table className="w-full text-sm">
            <caption className="sr-only">Default dollars-per-watt bands by system size</caption>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th scope="col" className="py-2 pr-4">System size (kW DC)</th>
                <th scope="col" className="py-2 pr-4">$/W low</th>
                <th scope="col" className="py-2">$/W high</th>
              </tr>
            </thead>
            <tbody>
              {DEFAULT_SOLAR_PRICING_CONFIG.bands.map((b) => (
                <tr key={b.minKw} className="border-t border-rule">
                  <td className="py-2 pr-4">
                    {b.minKw}–{b.maxKw === Infinity ? "+" : b.maxKw}
                  </td>
                  <td className="py-2 pr-4">${b.dollarsPerWattLow.toFixed(2)}</td>
                  <td className="py-2">${b.dollarsPerWattHigh.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Configurations ({configs.length})</h2>
        {configs.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            No configurations yet. Create one via <code className="font-mono text-xs">POST /api/solar/admin/pricing-config</code>,
            then publish it with <code className="font-mono text-xs">PATCH</code>.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {configs.map((c) => (
              <div key={c.id} className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-xs font-semibold">{c.version}</p>
                  <span
                    className={
                      c.status === "PUBLISHED"
                        ? "badge-green"
                        : c.status === "DRAFT"
                          ? "badge-amber"
                          : "badge-neutral"
                    }
                  >
                    {c.status}
                  </span>
                </div>
                <p className="mt-1 text-sm">{c.name}</p>
                <dl className="mt-2 grid grid-cols-2 gap-1 text-xs text-muted">
                  <div>
                    <dt className="inline">Market: </dt>
                    <dd className="inline">{c.market}</dd>
                  </div>
                  <div>
                    <dt className="inline">Basis: </dt>
                    <dd className="inline">{c.dataBasis}</dd>
                  </div>
                  <div>
                    <dt className="inline">Samples: </dt>
                    <dd className="inline">{c.sampleCount}</dd>
                  </div>
                  <div>
                    <dt className="inline">Valid from: </dt>
                    <dd className="inline">{c.validFrom.toLocaleDateString()}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">External data sources</h2>
        <div className="card mt-3 p-4">
          <ul className="space-y-2 text-sm">
            {providers.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3">
                <span>{p.label}</span>
                <span className={p.configured ? "badge-green" : "badge-neutral"}>
                  {p.configured ? "Active" : (p.reason ?? "Unavailable")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
