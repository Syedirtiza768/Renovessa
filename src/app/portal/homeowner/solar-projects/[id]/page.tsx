import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { solarPlannerUsable } from "@/lib/feature-flags";
import { EstimatorSubmissionSummary } from "@/components/portal/EstimatorSubmissionSummary";
import { buildAnswerMapEstimatorSnapshot } from "@/lib/estimator-submission";

export default async function HomeownerSolarProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "HOMEOWNER") redirect("/login");
  if (!solarPlannerUsable()) redirect("/portal/homeowner");

  const { id } = await params;
  const project = await prisma.solarProject.findFirst({
    where: { id, homeownerId: session.id },
    include: {
      layouts: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 1 },
      productionEstimates: { orderBy: { createdAt: "desc" }, take: 1 },
      costEstimates: { orderBy: { createdAt: "desc" }, take: 1 },
      briefs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!project) notFound();

  const layout = project.layouts[0];
  const production = project.productionEstimates[0];
  const cost = project.costEstimates[0];
  const answers = project.answersJson && typeof project.answersJson === "object"
    ? project.answersJson as Record<string, unknown>
    : {};
  const snapshot = buildAnswerMapEstimatorSnapshot({
    estimatorId: "solar",
    estimatorLabel: "Solar",
    source: "solar",
    answers: {
      ...answers,
      propertyType: project.propertyType,
      ownershipStatus: project.ownershipStatus,
      occupancyStatus: project.occupancyStatus,
      projectGoal: project.projectGoal,
      timelineCategory: project.timelineCategory,
      city: project.city,
      state: project.state,
      postalCode: project.postalCode,
      buildingConfirmed: project.buildingConfirmed,
    },
    contact: {},
    estimate: cost ? {
      low: cost.installedCostLow,
      mid: cost.installedCostLow,
      high: cost.installedCostHigh,
      displayable: cost.displayable,
      withheldReason: cost.withheldReason,
      confidence: cost.confidenceLevel,
      assumptions: cost.assumptionsJson,
      exclusions: cost.exclusionsJson,
      costDrivers: cost.costDriversJson,
    } : null,
  });

  return (
    <div>
      <Link href="/portal/homeowner/solar-projects" className="text-sm text-copper hover:underline">← Back to solar plans</Link>
      <div className="mt-4">
        <p className="font-mono text-xs text-muted">{project.referenceNumber}</p>
        <h1 className="mt-1 text-2xl font-bold">Solar plan</h1>
        <p className="mt-1 text-sm text-muted">{project.city || project.postalCode || "Location not specified"} · Status: {project.status.replace(/_/g, " ")}</p>
      </div>

      <EstimatorSubmissionSummary snapshot={snapshot} />

      <section className="mt-6 card p-4" aria-labelledby="solar-layout-heading">
        <h2 id="solar-layout-heading" className="font-semibold">Roof and system layout</h2>
        {layout ? (
          <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div><dt className="text-muted">Panels selected</dt><dd>{layout.panelCount}</dd></div>
            <div><dt className="text-muted">System size</dt><dd>{layout.dcSystemSizeKw.toFixed(1)} kW DC</dd></div>
            <div><dt className="text-muted">Layout approach</dt><dd>{layout.strategy.replace(/_/g, " ").toLowerCase()}</dd></div>
            <div><dt className="text-muted">Roof sections excluded</dt><dd>{layout.excludedSegmentIndices.length || "None"}</dd></div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-muted">No saved roof layout yet.</p>
        )}
        {production && (
          <p className="mt-4 text-sm text-muted">
            Estimated first-year production: {production.annualAcKwh ? `${Math.round(production.annualAcKwh).toLocaleString()} kWh` : "not modelled"}.
          </p>
        )}
      </section>

      <section className="mt-6 card p-4">
        <h2 className="font-semibold">Project brief</h2>
        <p className="mt-2 text-sm text-muted">
          {project.briefs[0] ? "Your structured solar project brief is saved with this plan." : "No project brief has been generated yet."}
        </p>
      </section>
    </div>
  );
}
