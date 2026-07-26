import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { measurementSchema } from "@/lib/bathroom/schemas";
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
    const data = measurementSchema.parse(await req.json());
    const measurement = await prisma.bathroomMeasurement.create({
      data: {
        projectId: id,
        measurementMethod: data.measurementMethod,
        unitSystem: data.unitSystem,
        ceilingHeight: data.ceilingHeight ?? null,
        isConfirmed: data.isConfirmed,
        confirmedAt: data.isConfirmed ? new Date() : null,
        source: data.source ?? null,
        metadata: (data.metadata as any) ?? null,
      },
    });
    return NextResponse.json(measurement, { status: 201 });
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
    const measurements = await prisma.bathroomMeasurement.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(measurements);
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Internal error" }, { status });
  }
}
