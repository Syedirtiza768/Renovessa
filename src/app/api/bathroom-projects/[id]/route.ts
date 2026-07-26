import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { updateBathroomProjectSchema } from "@/lib/bathroom/schemas";
import { assertBathroomProjectAccess } from "@/lib/bathroom/authorization";
import { bathroomPlannerUsable } from "@/lib/feature-flags";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!bathroomPlannerUsable()) {
    return NextResponse.json({ error: "Bathroom planner is not enabled." }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id } = await params;
    const project = await assertBathroomProjectAccess(session, id);
    const [measurements, layouts, conditions, selections, estimates, permitAssessments, briefs] = await Promise.all([
      prisma.bathroomMeasurement.findMany({ where: { projectId: id }, orderBy: { createdAt: "desc" } }),
      prisma.bathroomLayout.findMany({ where: { projectId: id }, orderBy: { createdAt: "desc" } }),
      prisma.bathroomCondition.findMany({ where: { projectId: id }, orderBy: { createdAt: "desc" } }),
      prisma.bathroomSelection.findMany({ where: { projectId: id }, orderBy: { createdAt: "desc" } }),
      prisma.bathroomEstimate.findMany({ where: { projectId: id }, orderBy: { createdAt: "desc" }, take: 10 }),
      prisma.permitAssessment.findMany({ where: { projectId: id }, orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.projectBrief.findMany({ where: { projectId: id }, orderBy: { createdAt: "desc" }, take: 5 }),
    ]);
    return NextResponse.json({
      ...project,
      measurements, layouts, conditions, selections, estimates, permitAssessments, briefs,
    });
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Internal error" }, { status });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!bathroomPlannerUsable()) {
    return NextResponse.json({ error: "Bathroom planner is not enabled." }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id } = await params;
    const project = await assertBathroomProjectAccess(session, id);
    const data = updateBathroomProjectSchema.parse(await req.json());

    // Homeowners cannot escalate status beyond the planner lifecycle; admins can.
    if (session?.role === "HOMEOWNER") {
      delete (data as any).status;
    }

    const updated = await prisma.bathroomProject.update({
      where: { id },
      data: {
        ...(data.bathroomType !== undefined ? { bathroomType: data.bathroomType } : {}),
        ...(data.projectObjective !== undefined ? { projectObjective: data.projectObjective } : {}),
        ...(data.propertyType !== undefined ? { propertyType: data.propertyType } : {}),
        ...(data.ownershipStatus !== undefined ? { ownershipStatus: data.ownershipStatus } : {}),
        ...(data.occupancyStatus !== undefined ? { occupancyStatus: data.occupancyStatus } : {}),
        ...(data.budgetMinimum !== undefined ? { budgetMinimum: data.budgetMinimum } : {}),
        ...(data.budgetMaximum !== undefined ? { budgetMaximum: data.budgetMaximum } : {}),
        ...(data.desiredStartDate !== undefined ? { desiredStartDate: data.desiredStartDate } : {}),
        ...(data.timelineCategory !== undefined ? { timelineCategory: data.timelineCategory } : {}),
        ...(data.currentStep !== undefined ? { currentStep: data.currentStep } : {}),
        ...(data.completionPercentage !== undefined ? { completionPercentage: data.completionPercentage } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.answers !== undefined ? { answersJson: data.answers } : {}),
      },
    });

    if (session?.role === "HOMEOWNER") {
      await logAuditEvent({
        eventType: "STATUS_CHANGED",
        description: `Bathroom project ${project.referenceNumber} updated (step: ${data.currentStep ?? project.currentStep ?? "?"})`,
        actorId: session.id,
        bathroomProjectId: id,
        metadata: { completionPercentage: data.completionPercentage },
      });
    }

    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json({ error: e.errors?.[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Internal error" }, { status });
  }
}
