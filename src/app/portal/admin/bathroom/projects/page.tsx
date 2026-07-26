import Link from "next/link";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { bathroomRockvilleEnabled } from "@/lib/feature-flags";

export default async function BathroomProjectsPage() {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) redirect("/login");
  if (!bathroomRockvilleEnabled()) redirect("/portal/admin");

  const projects = await prisma.bathroomProject.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      homeowner: { select: { id: true, email: true, name: true } },
      _count: { select: { estimates: true, briefs: true, layouts: true } },
    },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Bathroom Projects</h1>
        <Link href="/portal/admin/bathroom/analytics" className="text-sm text-copper hover:underline">
          View analytics →
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs uppercase text-muted">
            <tr>
              <th className="py-2 pr-4">Reference</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Objective</th>
              <th className="py-2 pr-4">Homeowner</th>
              <th className="py-2 pr-4">Estimates</th>
              <th className="py-2 pr-4">Briefs</th>
              <th className="py-2 pr-4">Created</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-b hover:bg-bone-1">
                <td className="py-2 pr-4 font-mono text-xs">{p.referenceNumber}</td>
                <td className="py-2 pr-4">{p.status}</td>
                <td className="py-2 pr-4">{p.bathroomType ?? "—"}</td>
                <td className="py-2 pr-4">{p.projectObjective ?? "—"}</td>
                <td className="py-2 pr-4">{p.homeowner?.email ?? "Anonymous"}</td>
                <td className="py-2 pr-4">{p._count.estimates}</td>
                <td className="py-2 pr-4">{p._count.briefs}</td>
                <td className="py-2 pr-4 text-xs text-muted">{p.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={8} className="py-4 text-center text-muted">No bathroom projects yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex gap-4">
        <Link href="/portal/admin/bathroom/estimator-config" className="text-sm text-copper hover:underline">
          Estimator config →
        </Link>
        <Link href="/portal/admin/bathroom/content" className="text-sm text-copper hover:underline">
          Content versions →
        </Link>
      </div>
    </div>
  );
}
