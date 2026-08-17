import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { randomBytes } from "crypto";
import { assertBathroomProjectAccess } from "@/lib/bathroom/authorization";
import { buildProjectBrief } from "@/lib/bathroom/project-brief";
import { BATHROOM_PROJECT_BRIEF_ENABLED } from "@/lib/feature-flags";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!BATHROOM_PROJECT_BRIEF_ENABLED) {
    return NextResponse.json({ error: "Project brief is not enabled." }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id } = await params;
    const project = await assertBathroomProjectAccess(session, id);

    const [measurements, layouts, conditions, selections, estimates, permitAssessments] = await Promise.all([
      prisma.bathroomMeasurement.findMany({ where: { projectId: id }, orderBy: { createdAt: "desc" }, take: 1 }),
      prisma.bathroomLayout.findMany({ where: { projectId: id }, orderBy: { createdAt: "desc" } }),
      prisma.bathroomCondition.findMany({ where: { projectId: id } }),
      prisma.bathroomSelection.findMany({ where: { projectId: id } }),
      prisma.bathroomEstimate.findMany({ where: { projectId: id }, orderBy: { createdAt: "desc" }, take: 1, include: { lineItems: true } }),
      prisma.permitAssessment.findMany({ where: { projectId: id }, orderBy: { createdAt: "desc" }, take: 1 }),
    ]);

    if (estimates.length === 0) {
      return NextResponse.json({ error: "Generate an estimate before building the brief." }, { status: 409 });
    }

    const latestEstimate = estimates[0];
    const latestPermit = permitAssessments[0];
    const existingLayout = layouts.find((l) => l.layoutType === "EXISTING");
    const proposedLayout = layouts.find((l) => l.layoutType === "PROPOSED");

    // Reconstruct an EstimateResult-like object for the brief builder.
    const estimateResult = {
      lowAmount: latestEstimate.lowAmount,
      expectedLowAmount: latestEstimate.expectedLowAmount,
      expectedHighAmount: latestEstimate.expectedHighAmount,
      highComplexityAmount: latestEstimate.highComplexityAmount,
      contingencyAmount: latestEstimate.contingencyAmount,
      confidenceLevel: latestEstimate.confidenceLevel,
      lineItems: latestEstimate.lineItems.map((li) => ({
        category: li.category, description: li.description, quantity: li.quantity, unit: li.unit,
        unitRate: li.unitRate, lowAmount: li.lowAmount, highAmount: li.highAmount,
        multiplier: li.multiplier, calculationReference: li.calculationReference ?? "", sortOrder: li.sortOrder,
      })),
      assumptions: (latestEstimate.assumptionsJson as any) ?? [],
      unknowns: (latestEstimate.unknownsJson as any) ?? [],
      exclusions: (latestEstimate.exclusionsJson as any) ?? [],
      costDrivers: (latestEstimate.costDriversJson as any) ?? [],
      configVersion: "stored",
      calculationTimestamp: latestEstimate.createdAt.toISOString(),
    };

    const permitResult = latestPermit
      ? {
          jurisdiction: latestPermit.jurisdiction,
          buildingPermitLikelihood: latestPermit.buildingPermitLikelihood,
          plumbingPermitLikelihood: latestPermit.plumbingPermitLikelihood,
          electricalPermitLikelihood: latestPermit.electricalPermitLikelihood,
          mechanicalPermitLikelihood: latestPermit.mechanicalPermitLikelihood,
          hoaReviewLikelihood: latestPermit.hoaReviewLikelihood,
          reviewRequired: latestPermit.reviewRequired,
          assumptions: ((latestPermit.assumptionsJson as any)?.assumptions) ?? [],
          questionsForContractor: ((latestPermit.assumptionsJson as any)?.questionsForContractor) ?? [],
          sourceVersion: latestPermit.sourceVersion,
        }
      : {
          jurisdiction: "Rockville, MD / Montgomery County",
          buildingPermitLikelihood: "JURISDICTION_REVIEW_NEEDED" as const,
          plumbingPermitLikelihood: "JURISDICTION_REVIEW_NEEDED" as const,
          electricalPermitLikelihood: "JURISDICTION_REVIEW_NEEDED" as const,
          mechanicalPermitLikelihood: "JURISDICTION_REVIEW_NEEDED" as const,
          hoaReviewLikelihood: "UNLIKELY" as const,
          reviewRequired: true,
          assumptions: ["Run the permit navigator for a project-specific assessment."],
          questionsForContractor: [],
          sourceVersion: "none",
        };

    const brief = buildProjectBrief({
      project: {
        id: project.id,
        referenceNumber: project.referenceNumber,
        bathroomType: project.bathroomType ?? undefined,
        projectObjective: project.projectObjective ?? undefined,
        propertyType: project.propertyType ?? undefined,
        ownershipStatus: project.ownershipStatus ?? undefined,
        occupancyStatus: project.occupancyStatus ?? undefined,
        budgetMinimum: project.budgetMinimum ?? undefined,
        budgetMaximum: project.budgetMaximum ?? undefined,
        desiredStartDate: project.desiredStartDate ?? undefined,
        timelineCategory: project.timelineCategory ?? undefined,
        qualificationGrade: project.qualificationGrade ?? undefined,
      },
      location: {
        city: "Rockville", state: "MD", locationId: "rockville-md",
      },
      measurements: measurements[0]
        ? {
            method: measurements[0].measurementMethod,
            ceilingHeight: measurements[0].ceilingHeight ?? undefined,
            confirmed: measurements[0].isConfirmed,
          }
        : undefined,
      existingLayout: existingLayout
        ? { name: existingLayout.name ?? undefined, geometry: existingLayout.geometryJson, calculations: existingLayout.calculationJson as any }
        : undefined,
      proposedLayout: proposedLayout
        ? { name: proposedLayout.name ?? undefined, geometry: proposedLayout.geometryJson, calculations: proposedLayout.calculationJson as any }
        : undefined,
      selections: selections.map((s) => ({
        category: s.category, selectionType: s.selectionType ?? undefined,
        qualityTier: s.qualityTier ?? undefined, brand: s.brand ?? undefined, model: s.model ?? undefined,
      })),
      conditions: conditions.map((c) => ({ type: c.conditionType, severity: c.severity ?? undefined, notes: c.notes ?? undefined })),
      estimate: estimateResult as any,
      permit: permitResult as any,
      confidence: { level: latestEstimate.confidenceLevel, reasons: [], improvements: [] },
      mediaCount: 0,
    });

    const saved = await prisma.projectBrief.create({
      data: {
        projectId: id,
        version: 1,
        briefJson: brief as any,
      },
    });

    if (session?.role === "HOMEOWNER") {
      await logAuditEvent({
        eventType: "BATHROOM_BRIEF_GENERATED",
        description: `Project brief generated for ${project.referenceNumber}`,
        actorId: session.id,
        bathroomProjectId: id,
        metadata: { briefId: saved.id },
      });
    }

    return NextResponse.json({ brief, saved }, { status: 201 });
  } catch (e: any) {
    console.error("bathroom-brief POST", e);
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Internal error" }, { status });
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!BATHROOM_PROJECT_BRIEF_ENABLED) {
    return NextResponse.json({ error: "Project brief is not enabled." }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id } = await params;
    await assertBathroomProjectAccess(session, id);
    const briefs = await prisma.projectBrief.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    return NextResponse.json(briefs);
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Internal error" }, { status });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Create / revoke share link
  if (!BATHROOM_PROJECT_BRIEF_ENABLED) {
    return NextResponse.json({ error: "Project brief is not enabled." }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id } = await params;
    await assertBathroomProjectAccess(session, id);
    const { briefId, action, expiresDays } = await req.json();

    const brief = await prisma.projectBrief.findUnique({ where: { id: briefId } });
    if (!brief || brief.projectId !== id) {
      return NextResponse.json({ error: "Brief not found" }, { status: 404 });
    }

    if (action === "create_share") {
      const token = randomBytes(24).toString("base64url");
      const expiresAt = new Date(Date.now() + (expiresDays ?? 30) * 24 * 60 * 60 * 1000);
      const updated = await prisma.projectBrief.update({
        where: { id: briefId },
        data: { shareToken: token, shareExpiresAt: expiresAt },
      });
      if (session?.role === "HOMEOWNER") {
        await logAuditEvent({
          eventType: "BATHROOM_SHARE_LINK_CREATED",
          description: `Share link created for brief ${briefId}`,
          actorId: session.id,
          bathroomProjectId: id,
          metadata: { briefId, expiresAt: expiresAt.toISOString() },
        });
      }
      return NextResponse.json({ shareToken: updated.shareToken, shareExpiresAt: updated.shareExpiresAt });
    }

    if (action === "revoke_share") {
      await prisma.projectBrief.update({
        where: { id: briefId },
        data: { shareToken: null, shareExpiresAt: null },
      });
      if (session?.role === "HOMEOWNER") {
        await logAuditEvent({
          eventType: "BATHROOM_SHARE_LINK_REVOKED",
          description: `Share link revoked for brief ${briefId}`,
          actorId: session.id,
          bathroomProjectId: id,
          metadata: { briefId },
        });
      }
      return NextResponse.json({ revoked: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Internal error" }, { status });
  }
}
