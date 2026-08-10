import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { solarLandingEnabled } from "@/lib/feature-flags";
import { formatDate } from "@/lib/utils";
import type { AuditEventType } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Solar project pipeline + funnel counters (§59).
 *
 * Also surfaces the two operational signals that matter most: roof-analysis
 * failures (a coverage or credential problem) and production-model
 * disagreements beyond the review threshold (a modelling problem).
 */
/** The planner funnel, in the order a homeowner moves through it (§59). */
const FUNNEL_STEPS: AuditEventType[] = [
  "SOLAR_PROJECT_CREATED",
  "SOLAR_ADDRESS_RESOLVED",
  "SOLAR_ROOF_ANALYSIS_COMPLETED",
  "SOLAR_BUILDING_CONFIRMED",
  "SOLAR_USAGE_PROVIDED",
  "SOLAR_ESTIMATE_GENERATED",
  "SOLAR_BRIEF_GENERATED",
  "SOLAR_RFP_SUBMITTED",
];

export default async function SolarProjectsAdminPage() {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) redirect("/login");
  if (!solarLandingEnabled()) redirect("/portal/admin");

  const [projects, statusCounts, funnel, discrepancies, failures] = await Promise.all([
    prisma.solarProject.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        homeowner: { select: { email: true, name: true } },
        projectRequest: { select: { referenceNumber: true, status: true } },
        _count: { select: { costEstimates: true, briefs: true, roofAnalyses: true } },
      },
    }),
    prisma.solarProject.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.auditEvent.groupBy({
      by: ["eventType"],
      // eventType is an enum, so this is an explicit membership test rather
      // than a prefix match.
      where: { eventType: { in: FUNNEL_STEPS } },
      _count: { _all: true },
    }),
    prisma.auditEvent.count({ where: { eventType: "SOLAR_PRODUCTION_MODEL_DISCREPANCY" } }),
    prisma.auditEvent.findMany({
      where: { eventType: { in: ["SOLAR_ROOF_ANALYSIS_FAILED", "SOLAR_PROVIDER_FAILURE"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const countFor = (type: AuditEventType) => funnel.find((f) => f.eventType === type)?._count._all ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold">Solar projects</h1>
      <p className="mt-1 text-sm text-muted">
        Planner funnel, project pipeline, and the provider failures worth acting on.
      </p>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Funnel</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FUNNEL_STEPS.map((type) => (
            <div key={type} className="kpi-card">
              <p className="text-xs uppercase tracking-wide text-muted">
                {type.replace("SOLAR_", "").replaceAll("_", " ").toLowerCase()}
              </p>
              <p className="mt-1 text-2xl font-bold">{countFor(type)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <h2 className="text-sm font-semibold">Status distribution</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {statusCounts.map((s) => (
              <li key={s.status} className="flex justify-between">
                <span className="text-muted">{s.status}</span>
                <span className="font-medium">{s._count._all}</span>
              </li>
            ))}
            {statusCounts.length === 0 && <li className="text-muted">No projects yet.</li>}
          </ul>
        </div>

        <div className="card p-4">
          <h2 className="text-sm font-semibold">Model quality</h2>
          <p className="mt-2 text-sm">
            <span className="text-2xl font-bold">{discrepancies}</span>{" "}
            <span className="text-muted">
              production runs where the two models disagreed beyond the review threshold
            </span>
          </p>
          <p className="mt-2 text-xs text-muted">
            A rising count usually means shading or roof geometry the models handle differently — worth calibrating
            the thresholds or investigating specific properties.
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Recent provider failures</h2>
        {failures.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No provider failures recorded.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {failures.map((f) => (
              <li key={f.id} className="card p-3 text-sm">
                <span className="text-muted">{formatDate(f.createdAt)}</span> — {f.description}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Recent projects ({projects.length})</h2>
        <div className="card mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th scope="col" className="p-3">Reference</th>
                <th scope="col" className="p-3">Location</th>
                <th scope="col" className="p-3">Status</th>
                <th scope="col" className="p-3">Roof</th>
                <th scope="col" className="p-3">Estimates</th>
                <th scope="col" className="p-3">RFQ</th>
                <th scope="col" className="p-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-t border-rule">
                  <td className="p-3 font-mono text-xs">{p.referenceNumber}</td>
                  <td className="p-3">
                    {[p.city, p.state].filter(Boolean).join(", ") || <span className="text-muted">—</span>}
                  </td>
                  <td className="p-3">{p.status}</td>
                  <td className="p-3">
                    {p._count.roofAnalyses > 0 ? (p.buildingConfirmed ? "confirmed" : "unconfirmed") : "—"}
                  </td>
                  <td className="p-3">{p._count.costEstimates}</td>
                  <td className="p-3">
                    {p.projectRequest ? (
                      <Link href={`/portal/admin/leads`} className="text-copper underline">
                        {p.projectRequest.referenceNumber}
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="p-3 text-muted">{formatDate(p.createdAt)}</td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-muted">
                    No solar projects yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
