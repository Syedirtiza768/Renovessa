import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { generateReferenceNumber } from "@/lib/utils";
import { createBathroomProjectSchema } from "@/lib/bathroom/schemas";
import { bathroomPlannerUsable } from "@/lib/feature-flags";

// Lightweight in-memory rate limit (matches /api/advisor pattern).
const WINDOW_MS = 5 * 60_000;
const MAX_REQUESTS = 30;
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_REQUESTS;
}

export async function POST(req: NextRequest) {
  if (!bathroomPlannerUsable()) {
    return NextResponse.json({ error: "Bathroom planner is not enabled." }, { status: 404 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  try {
    const body = createBathroomProjectSchema.parse(await req.json());
    const session = await getSession();

    // Anonymous drafts are allowed but not linked to a user. Authenticated
    // homeowners get ownership; admins cannot create on behalf here.
    const homeownerId = session?.role === "HOMEOWNER" ? session.id : null;

    // De-duplicate anonymous drafts by clientGeneratedId.
    if (body.clientGeneratedId && !homeownerId) {
      const existing = await prisma.bathroomProject.findFirst({
        where: { clientGeneratedId: body.clientGeneratedId, homeownerId: null },
      });
      if (existing) {
        return NextResponse.json({ id: existing.id, referenceNumber: existing.referenceNumber, resumed: true });
      }
    }

    const project = await prisma.bathroomProject.create({
      data: {
        referenceNumber: generateReferenceNumber(),
        homeownerId,
        clientGeneratedId: body.clientGeneratedId ?? null,
        plannerMode: body.plannerMode,
        bathroomType: body.bathroomType ?? null,
        projectObjective: body.projectObjective ?? null,
        propertyType: body.propertyType ?? null,
        ownershipStatus: body.ownershipStatus ?? null,
        occupancyStatus: body.occupancyStatus ?? null,
        budgetMinimum: body.budgetMinimum ?? null,
        budgetMaximum: body.budgetMaximum ?? null,
        desiredStartDate: body.desiredStartDate ?? null,
        timelineCategory: body.timelineCategory ?? null,
        answersJson: body.answers ?? null,
        status: "IN_PROGRESS",
      },
    });

    if (session?.role === "HOMEOWNER") {
      await logAuditEvent({
        eventType: "BATHROOM_PROJECT_CREATED",
        description: `Bathroom project ${project.referenceNumber} created by homeowner`,
        actorId: session.id,
        bathroomProjectId: project.id,
      });
    } else {
      await logAuditEvent({
        eventType: "BATHROOM_PROJECT_CREATED",
        description: `Bathroom project ${project.referenceNumber} created (anonymous draft)`,
        bathroomProjectId: project.id,
        metadata: { anonymous: true, plannerMode: body.plannerMode },
      });
    }

    return NextResponse.json({
      id: project.id,
      referenceNumber: project.referenceNumber,
      createdAt: project.createdAt,
    }, { status: 201 });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json({ error: e.errors?.[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    console.error("bathroom-projects POST", e);
    return NextResponse.json({ error: "Failed to create bathroom project" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.role === "HOMEOWNER") {
    const projects = await prisma.bathroomProject.findMany({
      where: { homeownerId: session.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(projects);
  }

  // Admins see all (capped)
  const projects = await prisma.bathroomProject.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { homeowner: { select: { id: true, email: true, name: true } } },
  });
  return NextResponse.json(projects);
}
