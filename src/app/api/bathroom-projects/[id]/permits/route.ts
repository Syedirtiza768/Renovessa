import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { permitAnswersSchema } from "@/lib/bathroom/schemas";
import { assertBathroomProjectAccess } from "@/lib/bathroom/authorization";
import { assessPermits } from "@/lib/bathroom/permits";
import { BATHROOM_PERMIT_NAVIGATOR_ENABLED } from "@/lib/feature-flags";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!BATHROOM_PERMIT_NAVIGATOR_ENABLED) {
    return NextResponse.json({ error: "Permit navigator is not enabled." }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id } = await params;
    await assertBathroomProjectAccess(session, id);
    const answers = permitAnswersSchema.parse(await req.json());

    const result = assessPermits({
      fixtures_moving: answers.fixtures_moving,
      plumbing_changing: answers.plumbing_changing,
      electrical_wiring_changing: answers.electrical_wiring_changing,
      lighting_added_relocated: answers.lighting_added_relocated,
      ventilation_modified: answers.ventilation_modified,
      wall_changing: answers.wall_changing,
      structural_framing_affected: answers.structural_framing_affected,
      new_bathroom_created: answers.new_bathroom_created,
      in_condominium: answers.in_condominium,
      hoa_approval_potentially_required: answers.hoa_approval_potentially_required,
    });

    const saved = await prisma.permitAssessment.create({
      data: {
        projectId: id,
        jurisdiction: result.jurisdiction,
        buildingPermitLikelihood: result.buildingPermitLikelihood,
        plumbingPermitLikelihood: result.plumbingPermitLikelihood,
        electricalPermitLikelihood: result.electricalPermitLikelihood,
        mechanicalPermitLikelihood: result.mechanicalPermitLikelihood,
        hoaReviewLikelihood: result.hoaReviewLikelihood,
        reviewRequired: result.reviewRequired,
        assumptionsJson: { assumptions: result.assumptions, questionsForContractor: result.questionsForContractor } as any,
        sourceVersion: result.sourceVersion,
      },
    });

    if (session?.role === "HOMEOWNER") {
      await logAuditEvent({
        eventType: "BATHROOM_PERMIT_ASSESSED",
        description: `Permit assessment created for bathroom project`,
        actorId: session.id,
        bathroomProjectId: id,
        metadata: { assessmentId: saved.id, reviewRequired: result.reviewRequired },
      });
    }

    return NextResponse.json({ assessment: saved, questionsForContractor: result.questionsForContractor }, { status: 201 });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json({ error: e.errors?.[0]?.message ?? "Invalid answers" }, { status: 400 });
    }
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Internal error" }, { status });
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!BATHROOM_PERMIT_NAVIGATOR_ENABLED) {
    return NextResponse.json({ error: "Permit navigator is not enabled." }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id } = await params;
    await assertBathroomProjectAccess(session, id);
    const assessments = await prisma.permitAssessment.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    return NextResponse.json(assessments);
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Internal error" }, { status });
  }
}
