import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { bathroomPlannerUsable } from "@/lib/feature-flags";

export default async function HomeownerBathroomProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "HOMEOWNER") redirect("/login");
  if (!bathroomPlannerUsable()) redirect("/portal/homeowner");

  const { id } = await params;
  const project = await prisma.bathroomProject.findFirst({
    where: { id, homeownerId: session.id },
    include: {
      estimates: { orderBy: { createdAt: "desc" }, take: 1 },
      briefs: { orderBy: { createdAt: "desc" }, take: 1 },
      permitAssessments: { orderBy: { createdAt: "desc" }, take: 1 },
      proposals: {
        orderBy: { totalPrice: "asc" },
        include: { contractor: { select: { companyName: true, trade: true, tier: true, licenseVerified: true, insuranceVerified: true } } },
      },
    },
  });

  if (!project) notFound();

  const latestEstimate = project.estimates[0];
  const latestBrief = project.briefs[0];
  const proposals = project.proposals;

  return (
    <div>
      <Link href="/portal/homeowner/bathroom-projects" className="text-sm text-copper hover:underline">
        ← Back to bathroom plans
      </Link>

      <div className="mt-4">
        <p className="font-mono text-xs text-muted">{project.referenceNumber}</p>
        <h1 className="mt-1 text-2xl font-bold capitalize">
          {project.bathroomType?.replace(/_/g, " ") ?? "Bathroom"} remodel
        </h1>
        <p className="mt-1 text-sm text-muted">
          Status: {project.status.replace(/_/g, " ")} · Created {project.createdAt.toLocaleDateString()}
        </p>
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Planning estimate</h2>
        {latestEstimate ? (
          <div className="mt-2 rounded-lg border p-4">
            <p className="text-lg">
              ${latestEstimate.lowAmount.toLocaleString()} – ${latestEstimate.highComplexityAmount.toLocaleString()}
            </p>
            <p className="text-sm text-muted">
              Expected: ${latestEstimate.expectedLowAmount.toLocaleString()} – ${latestEstimate.expectedHighAmount.toLocaleString()} · Confidence: {latestEstimate.confidenceLevel}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">
            No estimate yet.{" "}
            <Link href="/bathroom-remodeling/rockville-md/planner" className="text-copper hover:underline">
              Continue in the planner →
            </Link>
          </p>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Project brief</h2>
        {latestBrief ? (
          <div className="mt-2 flex flex-wrap gap-3">
            <a
              href={`/api/bathroom-projects/${project.id}/brief/pdf`}
              className="rounded-lg border border-ink-15 px-4 py-2 text-sm font-medium text-ink-70 hover:border-ink-40"
            >
              Download PDF →
            </a>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">No brief generated yet.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Contractor proposals ({proposals.length})</h2>
        {proposals.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            No proposals yet. Promote this plan to a bid request to receive contractor proposals.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs uppercase text-muted">
                <tr>
                  <th className="py-2 pr-4">Contractor</th>
                  <th className="py-2 pr-4">Total price</th>
                  <th className="py-2 pr-4">Duration</th>
                  <th className="py-2 pr-4">Start date</th>
                  <th className="py-2 pr-4">Warranty</th>
                  <th className="py-2 pr-4">Permits</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="py-3 pr-4">
                      <p className="font-medium">{p.contractor.companyName}</p>
                      <p className="text-xs text-muted">{p.contractor.trade} · {p.contractor.tier}</p>
                      <div className="mt-1 flex gap-1">
                        {p.contractor.licenseVerified && <span className="badge-green text-xs">Licensed</span>}
                        {p.contractor.insuranceVerified && <span className="badge-green text-xs">Insured</span>}
                      </div>
                    </td>
                    <td className="py-3 pr-4 font-semibold">${p.totalPrice.toLocaleString()}</td>
                    <td className="py-3 pr-4">{p.estimatedDuration ?? "—"}</td>
                    <td className="py-3 pr-4">{p.estimatedStartDate ?? "—"}</td>
                    <td className="py-3 pr-4 text-xs">{p.warranty ?? "—"}</td>
                    <td className="py-3 pr-4 text-xs">{p.permitHandling ?? "—"}</td>
                    <td className="py-3 pr-4">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {proposals.length >= 2 && (
          <div className="mt-4 rounded-lg border border-ink-15 bg-bone-1 p-4">
            <h3 className="text-sm font-semibold">Price comparison</h3>
            <p className="mt-1 text-sm text-muted">
              Lowest: ${Math.min(...proposals.map((p) => p.totalPrice)).toLocaleString()} ·
              Highest: ${Math.max(...proposals.map((p) => p.totalPrice)).toLocaleString()} ·
              Spread: ${(Math.max(...proposals.map((p) => p.totalPrice)) - Math.min(...proposals.map((p) => p.totalPrice))).toLocaleString()}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
