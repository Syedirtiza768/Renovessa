import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { bathroomPlannerUsable } from "@/lib/feature-flags";

export default async function HomeownerBathroomProjectsPage() {
  const session = await getSession();
  if (!session || session.role !== "HOMEOWNER") redirect("/login");
  if (!bathroomPlannerUsable()) redirect("/portal/homeowner");

  const projects = await prisma.bathroomProject.findMany({
    where: { homeownerId: session.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { estimates: true, briefs: true, proposals: true } } },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">My Bathroom Plans</h1>
        <Link href="/bathroom-remodeling/rockville-md/planner" className="btn-primary text-sm">
          + New bathroom plan
        </Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/portal/homeowner/bathroom-projects/${p.id}`}
            className="card p-4 hover:border-copper transition-colors"
          >
            <p className="font-mono text-xs text-muted">{p.referenceNumber}</p>
            <p className="mt-1 font-semibold capitalize">
              {p.bathroomType?.replace(/_/g, " ") ?? "Bathroom"} · {p.projectObjective?.replace(/_/g, " ") ?? "—"}
            </p>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div><dt className="text-muted">Status</dt><dd>{p.status.replace(/_/g, " ")}</dd></div>
              <div><dt className="text-muted">Estimates</dt><dd>{p._count.estimates}</dd></div>
              <div><dt className="text-muted">Proposals</dt><dd>{p._count.proposals}</dd></div>
            </dl>
          </Link>
        ))}
        {projects.length === 0 && (
          <p className="text-muted col-span-full">
            No bathroom plans yet.{" "}
            <Link href="/bathroom-remodeling/rockville-md/planner" className="text-copper hover:underline">
              Start the planner →
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
