import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { bathroomRockvilleEnabled } from "@/lib/feature-flags";
import { formatDate } from "@/lib/utils";
import { ContractorDispatchPanel } from "@/components/admin/ContractorDispatchPanel";

export default async function BathroomProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) redirect("/login");
  if (!bathroomRockvilleEnabled()) redirect("/portal/admin");

  const { id } = await params;
  const project = await prisma.bathroomProject.findUnique({
    where: { id },
    include: {
      homeowner: { select: { id: true, email: true, name: true, phone: true } },
      projectRequest: true,
      estimates: { orderBy: { createdAt: "desc" }, take: 1, include: { lineItems: true } },
      briefs: { orderBy: { createdAt: "desc" }, take: 3 },
      proposals: {
        orderBy: { createdAt: "desc" },
        include: { contractor: { include: { user: { select: { email: true } } } } },
      },
      conditions: true,
      selections: true,
      measurements: { orderBy: { createdAt: "desc" }, take: 1 },
      layouts: { orderBy: { createdAt: "desc" } },
      permitAssessments: { orderBy: { createdAt: "desc" }, take: 1 },
      auditEvents: { orderBy: { createdAt: "desc" }, take: 20, include: { actor: true } },
    },
  });

  if (!project) notFound();

  const latestEstimate = project.estimates[0] ?? null;
  const latestBrief = project.briefs[0] ?? null;
  const latestPermit = project.permitAssessments[0] ?? null;

  const contractors = await prisma.contractorProfile.findMany({
    where: {
      status: "active",
      tier: { notIn: ["SUSPENDED", "BANNED"] },
      trade: { contains: "bath", mode: "insensitive" },
    },
    include: { user: { select: { id: true, email: true } } },
  });

  const dispatchedContractorIds = project.proposals
    .filter((p) => p.status === "SENT" || p.status === "SUBMITTED" || p.status === "ACCEPTED")
    .map((p) => p.contractorId);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link href="/portal/admin/bathroom/projects" className="text-sm text-copper hover:underline">
              ← Projects
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-bold">{project.referenceNumber}</h1>
          <p className="text-muted">
            {project.bathroomType ?? "Bathroom"} · {project.projectObjective ?? "No objective"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge">{project.status}</span>
          {project.projectRequest && (
            <Link
              href={`/portal/admin/leads/${project.projectRequest.id}`}
              className="text-sm text-copper hover:underline"
            >
              View lead →
            </Link>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="font-semibold">Project Details</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div><dt className="text-muted">Bathroom type</dt><dd>{project.bathroomType ?? "—"}</dd></div>
            <div><dt className="text-muted">Objective</dt><dd>{project.projectObjective ?? "—"}</dd></div>
            <div><dt className="text-muted">Property</dt><dd>{project.propertyType ?? "—"}, {project.ownershipStatus ?? "—"}</dd></div>
            <div><dt className="text-muted">Budget</dt><dd>
              {project.budgetMinimum && project.budgetMaximum
                ? `$${project.budgetMinimum.toLocaleString()} – $${project.budgetMaximum.toLocaleString()}`
                : "Not specified"}
            </dd></div>
            <div><dt className="text-muted">Timeline</dt><dd>{project.timelineCategory ?? "—"}, start {project.desiredStartDate ?? "flexible"}</dd></div>
            <div><dt className="text-muted">Homeowner</dt><dd>{project.homeowner?.email ?? "Anonymous"} {project.homeowner?.name ? `(${project.homeowner.name})` : ""}</dd></div>
            <div><dt className="text-muted">Created</dt><dd>{formatDate(project.createdAt)}</dd></div>
            <div><dt className="text-muted">Mode</dt><dd>{project.plannerMode}</dd></div>
          </dl>
        </div>

        {latestEstimate && (
          <div className="card p-4">
            <h2 className="font-semibold">Planning Estimate</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div><dt className="text-muted">Range</dt><dd className="text-lg font-semibold">${latestEstimate.lowAmount.toLocaleString()} – ${latestEstimate.highComplexityAmount.toLocaleString()}</dd></div>
              <div><dt className="text-muted">Expected</dt><dd>${latestEstimate.expectedLowAmount.toLocaleString()} – ${latestEstimate.expectedHighAmount.toLocaleString()}</dd></div>
              <div><dt className="text-muted">Contingency</dt><dd>${latestEstimate.contingencyAmount.toLocaleString()}</dd></div>
              <div><dt className="text-muted">Confidence</dt><dd>{latestEstimate.confidenceLevel}</dd></div>
              <div><dt className="text-muted">Generated</dt><dd>{formatDate(latestEstimate.createdAt)}</dd></div>
            </dl>
            {latestEstimate.lineItems.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted mb-2">Line Items</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="border-b text-left text-muted">
                      <tr>
                        <th className="py-1 pr-3">Category</th>
                        <th className="py-1 pr-3">Low</th>
                        <th className="py-1">High</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestEstimate.lineItems.map((li) => (
                        <tr key={li.id} className="border-b border-rule/30">
                          <td className="py-1 pr-3">{li.category}</td>
                          <td className="py-1 pr-3">${li.lowAmount.toLocaleString()}</td>
                          <td className="py-1">${li.highAmount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {latestBrief && (
          <div className="card p-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Project Brief</h2>
              <a
                href={`/api/bathroom-projects/${id}/brief/pdf`}
                className="text-sm text-copper hover:underline"
              >
                Download PDF →
              </a>
            </div>
            <p className="mt-1 text-xs text-muted">Generated {formatDate(latestBrief.createdAt)} · Version {latestBrief.version}</p>
            <div className="mt-4 rounded-md border border-rule bg-blueprint p-4 text-sm max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(latestBrief.briefJson, null, 2)}</pre>
            </div>
          </div>
        )}

        {latestPermit && (
          <div className="card p-4">
            <h2 className="font-semibold">Permit Assessment</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div><dt className="text-muted">Jurisdiction</dt><dd>{latestPermit.jurisdiction}</dd></div>
              <div><dt className="text-muted">Building</dt><dd>{latestPermit.buildingPermitLikelihood}</dd></div>
              <div><dt className="text-muted">Plumbing</dt><dd>{latestPermit.plumbingPermitLikelihood}</dd></div>
              <div><dt className="text-muted">Electrical</dt><dd>{latestPermit.electricalPermitLikelihood}</dd></div>
              <div><dt className="text-muted">Mechanical</dt><dd>{latestPermit.mechanicalPermitLikelihood}</dd></div>
              <div><dt className="text-muted">HOA</dt><dd>{latestPermit.hoaReviewLikelihood}</dd></div>
            </dl>
          </div>
        )}

        {project.conditions.length > 0 && (
          <div className="card p-4">
            <h2 className="font-semibold">Existing Conditions</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {project.conditions.map((c) => (
                <li key={c.id} className="flex items-start gap-2">
                  <span className="badge-yellow text-xs">{c.severity ?? "?"}</span>
                  <span>{c.conditionType}{c.notes ? ` — ${c.notes}` : ""}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {project.selections.length > 0 && (
          <div className="card p-4">
            <h2 className="font-semibold">Material Selections</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {project.selections.map((s) => (
                <li key={s.id}>
                  <span className="text-muted">{s.category}:</span> {s.selectionType ?? "—"}{s.qualityTier ? ` (${s.qualityTier})` : ""}{s.brand ? ` · ${s.brand}` : ""}{s.model ? ` ${s.model}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        <ContractorDispatchPanel
          projectId={id}
          contractors={contractors.map((c) => ({
            id: c.id,
            companyName: c.companyName,
            trade: c.trade,
            tier: c.tier,
            email: c.user.email,
          }))}
          dispatchedContractorIds={dispatchedContractorIds}
          projectStatus={project.status}
        />

        {project.proposals.length > 0 && (
          <div className="card p-4 lg:col-span-2">
            <h2 className="font-semibold">Dispatched Proposals</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase text-muted">
                  <tr>
                    <th className="py-2 pr-4">Contractor</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Price</th>
                    <th className="py-2 pr-4">Sent</th>
                    <th className="py-2 pr-4">Viewed</th>
                    <th className="py-2">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {project.proposals.map((p) => (
                    <tr key={p.id} className="border-b border-rule/50">
                      <td className="py-2 pr-4">{p.contractor.companyName}</td>
                      <td className="py-2 pr-4"><span className="badge">{p.status}</span></td>
                      <td className="py-2 pr-4">{p.totalPrice > 0 ? `$${p.totalPrice.toLocaleString()}` : "—"}</td>
                      <td className="py-2 pr-4 text-xs">{p.sentAt ? formatDate(p.sentAt) : "—"}</td>
                      <td className="py-2 pr-4 text-xs">{p.firstViewedAt ? formatDate(p.firstViewedAt) : "—"}</td>
                      <td className="py-2 text-xs">{p.createdAt ? formatDate(p.createdAt) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="card p-4 lg:col-span-2">
          <h2 className="font-semibold">Audit Trail</h2>
          <ul className="mt-4 space-y-3">
            {project.auditEvents.map((event) => (
              <li key={event.id} className="flex flex-wrap gap-2 border-b border-rule/50 pb-2 text-sm sm:gap-3">
                <span className="font-mono text-xs text-muted whitespace-nowrap">{formatDate(event.createdAt)}</span>
                <span className="flex-1">{event.description}</span>
                {event.actor && (
                  <span className="text-xs text-muted whitespace-nowrap">{event.actor.name}</span>
                )}
              </li>
            ))}
            {project.auditEvents.length === 0 && (
              <li className="text-sm text-muted">No audit events yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
