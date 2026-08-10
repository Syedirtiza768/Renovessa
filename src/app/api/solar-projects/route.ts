import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { generateReferenceNumber } from "@/lib/utils";
import { createSolarProjectSchema } from "@/lib/solar/schemas";
import { solarPlannerUsable } from "@/lib/feature-flags";
import { checkSolarRateLimit } from "@/lib/solar/rate-limit";

/**
 * Create (or resume) a solar planner draft.
 *
 * Anonymous drafts are first-class: the roof visualization must not be gated
 * behind signup (§39). `clientGeneratedId` makes creation idempotent across
 * refreshes, double-mounts and extra tabs.
 */
export async function POST(req: NextRequest) {
  if (!solarPlannerUsable()) {
    return NextResponse.json({ error: "The solar planner is not enabled." }, { status: 404 });
  }
  const limited = checkSolarRateLimit(req, "project");
  if (limited) return limited;

  try {
    const body = createSolarProjectSchema.parse(await req.json());
    const session = await getSession();
    const homeownerId = session?.role === "HOMEOWNER" ? session.id : null;

    if (body.clientGeneratedId && !homeownerId) {
      const existing = await prisma.solarProject.findFirst({
        where: { clientGeneratedId: body.clientGeneratedId, homeownerId: null },
      });
      if (existing) {
        return NextResponse.json({
          id: existing.id,
          referenceNumber: existing.referenceNumber,
          resumed: true,
        });
      }
    }

    const project = await prisma.solarProject.create({
      data: {
        referenceNumber: generateReferenceNumber(),
        homeownerId,
        clientGeneratedId: body.clientGeneratedId ?? null,
        plannerMode: body.plannerMode,
        answersJson: body.answers ?? undefined,
        status: "IN_PROGRESS",
      },
    });

    await logAuditEvent({
      eventType: "SOLAR_PROJECT_CREATED",
      description: homeownerId
        ? `Solar project ${project.referenceNumber} created by homeowner`
        : `Solar project ${project.referenceNumber} created (anonymous draft)`,
      actorId: homeownerId ?? undefined,
      solarProjectId: project.id,
      metadata: { anonymous: !homeownerId, plannerMode: body.plannerMode },
    });

    return NextResponse.json(
      { id: project.id, referenceNumber: project.referenceNumber, createdAt: project.createdAt },
      { status: 201 },
    );
  } catch (e: unknown) {
    if ((e as { name?: string })?.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("solar-projects POST", e);
    return NextResponse.json({ error: "Failed to create solar project" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.role === "HOMEOWNER") {
    const projects = await prisma.solarProject.findMany({
      where: { homeownerId: session.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(projects);
  }

  const projects = await prisma.solarProject.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { homeowner: { select: { id: true, email: true, name: true } } },
  });
  return NextResponse.json(projects);
}
