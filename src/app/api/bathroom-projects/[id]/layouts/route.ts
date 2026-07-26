import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { createLayoutSchema } from "@/lib/bathroom/schemas";
import { assertBathroomProjectAccess } from "@/lib/bathroom/authorization";
import { calculateGeometry } from "@/lib/bathroom/geometry";
import { validateLayout, summarizeValidation } from "@/lib/bathroom/validation";
import { bathroomPlannerUsable } from "@/lib/feature-flags";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!bathroomPlannerUsable()) {
    return NextResponse.json({ error: "Bathroom planner is not enabled." }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id } = await params;
    await assertBathroomProjectAccess(session, id);
    const data = createLayoutSchema.parse(await req.json());

    const calculations = calculateGeometry(data.geometry);
    const issues = validateLayout(data.geometry);
    const summary = summarizeValidation(issues);

    const layout = await prisma.bathroomLayout.create({
      data: {
        projectId: id,
        layoutType: data.layoutType,
        name: data.name ?? null,
        geometryJson: data.geometry as any,
        calculationJson: calculations as any,
        validationJson: { issues, summary } as any,
        isConfirmed: data.isConfirmed,
      },
    });

    if (session?.role === "HOMEOWNER") {
      await logAuditEvent({
        eventType: "BATHROOM_LAYOUT_SAVED",
        description: `Layout ${data.layoutType} created for bathroom project`,
        actorId: session.id,
        bathroomProjectId: id,
        metadata: { layoutId: layout.id, layoutType: data.layoutType, blocking: summary.blocking },
      });
    }

    return NextResponse.json({ layout, calculations, validation: { issues, summary } }, { status: 201 });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json({ error: e.errors?.[0]?.message ?? "Invalid geometry" }, { status: 400 });
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
    const layouts = await prisma.bathroomLayout.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(layouts);
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Internal error" }, { status });
  }
}
