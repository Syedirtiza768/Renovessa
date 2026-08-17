import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { solarPlannerUsable } from "@/lib/feature-flags";

export default async function HomeownerSolarProjectsPage() {
  const session = await getSession();
  if (!session || session.role !== "HOMEOWNER") redirect("/login");
  if (!solarPlannerUsable()) redirect("/portal/homeowner");

  const projects = await prisma.solarProject.findMany({
    where: { homeownerId: session.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { layouts: true, productionEstimates: true, briefs: true } },
    },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">My Solar Plans</h1>
        <Link href="/solar/planner" className="btn-primary text-sm">+ New solar plan</Link>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/portal/homeowner/solar-projects/${project.id}`}
            className="card p-4 transition-colors hover:border-copper"
          >
            <p className="font-mono text-xs text-muted">{project.referenceNumber}</p>
            <p className="mt-1 font-semibold">{project.city || project.postalCode || "Solar project"}</p>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div><dt className="text-muted">Status</dt><dd>{project.status.replace(/_/g, " ")}</dd></div>
              <div><dt className="text-muted">Layouts</dt><dd>{project._count.layouts}</dd></div>
              <div><dt className="text-muted">Briefs</dt><dd>{project._count.briefs}</dd></div>
            </dl>
          </Link>
        ))}
        {projects.length === 0 && (
          <p className="text-muted md:col-span-2">
            No solar plans yet. <Link href="/solar/planner" className="text-copper hover:underline">Start the planner →</Link>
          </p>
        )}
      </div>
    </div>
  );
}
