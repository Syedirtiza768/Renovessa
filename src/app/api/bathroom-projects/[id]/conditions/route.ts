import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { conditionSchema } from "@/lib/bathroom/schemas";
import { assertBathroomProjectAccess } from "@/lib/bathroom/authorization";
import { bathroomPlannerUsable } from "@/lib/feature-flags";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!bathroomPlannerUsable()) {
    return NextResponse.json({ error: "Bathroom planner is not enabled." }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id } = await params;
    await assertBathroomProjectAccess(session, id);
    const data = conditionSchema.parse(await req.json());
    const condition = await prisma.bathroomCondition.create({
      data: {
        projectId: id,
        conditionType: data.conditionType,
        severity: data.severity ?? null,
        homeownerReported: data.homeownerReported,
        inspectionRequired: data.inspectionRequired,
        notes: data.notes ?? null,
        mediaIds: data.mediaIds,
      },
    });
    return NextResponse.json(condition, { status: 201 });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json({ error: e.errors?.[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Internal error" }, { status });
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!bathroomPlannerUsable()) {
    return NextResponse.json({ error: "Bathroom planner is not enabled." }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id } = await params;
    await assertBathroomProjectAccess(session, id);
    const conditions = await prisma.bathroomCondition.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(conditions);
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Internal error" }, { status });
  }
}
