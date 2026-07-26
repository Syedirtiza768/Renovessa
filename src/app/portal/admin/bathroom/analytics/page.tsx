import Link from "next/link";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { bathroomRockvilleEnabled } from "@/lib/feature-flags";

export default async function BathroomAnalyticsPage() {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) redirect("/login");
  if (!bathroomRockvilleEnabled()) redirect("/portal/admin");

  const [
    totalProjects,
    projectsWithEstimate,
    projectsWithBrief,
    projectsWithRfq,
    estimates,
    confidenceDistribution,
    objectiveDistribution,
    bathroomTypeDistribution,
    recentEvents,
  ] = await Promise.all([
    prisma.bathroomProject.count(),
    prisma.bathroomProject.count({ where: { estimates: { some: {} } } }),
    prisma.bathroomProject.count({ where: { briefs: { some: {} } } }),
    prisma.bathroomProject.count({ where: { NOT: { projectRequestId: null } } }),
    prisma.bathroomEstimate.findMany({ select: { lowAmount: true, highComplexityAmount: true }, take: 500 }),
    prisma.bathroomEstimate.groupBy({ by: ["confidenceLevel"], _count: true }),
    prisma.bathroomProject.groupBy({ by: ["projectObjective"], _count: true }),
    prisma.bathroomProject.groupBy({ by: ["bathroomType"], _count: true }),
    prisma.auditEvent.findMany({
      where: { bathroomProjectId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { eventType: true, description: true, createdAt: true, actorId: true },
    }),
  ]);

  const avgEstimate = estimates.length
    ? {
        low: Math.round(estimates.reduce((s, e) => s + e.lowAmount, 0) / estimates.length),
        high: Math.round(estimates.reduce((s, e) => s + e.highComplexityAmount, 0) / estimates.length),
      }
    : null;

  return (
    <div>
      <h1 className="text-2xl font-bold">Bathroom Analytics</h1>
      <p className="mt-1 text-sm text-muted">Conversion funnel, estimate averages, and recent audit events.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Metric label="Total projects" value={totalProjects} />
        <Metric label="With estimate" value={projectsWithEstimate} suffix={`${totalProjects ? Math.round((projectsWithEstimate / totalProjects) * 100) : 0}%`} />
        <Metric label="With brief" value={projectsWithBrief} suffix={`${totalProjects ? Math.round((projectsWithBrief / totalProjects) * 100) : 0}%`} />
        <Metric label="RFQ submitted" value={projectsWithRfq} suffix={`${totalProjects ? Math.round((projectsWithRfq / totalProjects) * 100) : 0}%`} />
      </div>

      {avgEstimate && (
        <div className="mt-4 rounded-lg border bg-bone-1 p-4">
          <p className="text-sm font-semibold">Average estimate range</p>
          <p className="mt-1 text-lg">${avgEstimate.low.toLocaleString()} – ${avgEstimate.high.toLocaleString()}</p>
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Distribution title="Confidence distribution" rows={confidenceDistribution} />
        <Distribution title="Objective distribution" rows={objectiveDistribution} />
      </div>

      <div className="mt-4">
        <Distribution title="Bathroom type distribution" rows={bathroomTypeDistribution} />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Recent bathroom audit events</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase text-muted">
              <tr>
                <th className="py-2 pr-4">Event</th>
                <th className="py-2 pr-4">Description</th>
                <th className="py-2 pr-4">Actor</th>
                <th className="py-2 pr-4">When</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((e, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2 pr-4 font-mono text-xs">{e.eventType}</td>
                  <td className="py-2 pr-4">{e.description}</td>
                  <td className="py-2 pr-4 text-xs text-muted">{e.actorId ?? "anonymous"}</td>
                  <td className="py-2 pr-4 text-xs text-muted">{e.createdAt.toLocaleString()}</td>
                </tr>
              ))}
              {recentEvents.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center text-muted">No events yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-8">
        <Link href="/portal/admin/bathroom/projects" className="text-sm text-copper hover:underline">← Back to projects</Link>
      </div>
    </div>
  );
}

function Metric({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-lg border bg-bone-1 p-4">
      <p className="text-xs uppercase text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {suffix && <p className="text-xs text-muted">{suffix} of total</p>}
    </div>
  );
}

function Distribution({ title, rows }: { title: string; rows: Array<Record<string, unknown>> }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm font-semibold">{title}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {rows.map((r, i) => {
          const entries = Object.entries(r);
          const key = String(entries[0]?.[1] ?? "—");
          const count = Number(entries.find((e) => e[0] === "_count")?.[1] ?? 0);
          return <li key={i} className="flex justify-between"><span>{key}</span><span className="font-medium">{count}</span></li>;
        })}
        {rows.length === 0 && <li className="text-muted">No data.</li>}
      </ul>
    </div>
  );
}
