import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { generateReferenceNumber } from "@/lib/utils";
import { bathroomContractorStudioEnabled } from "@/lib/feature-flags";
import { requireContractorProfile } from "@/lib/bathroom/authorization";
import { contractorStudioJobSchema } from "@/lib/bathroom/schemas";

export const runtime = "nodejs";

export async function GET() {
  if (!bathroomContractorStudioEnabled()) {
    return NextResponse.json({ error: "Contractor studio is not enabled." }, { status: 404 });
  }
  const session = await getSession();
  try {
    const profile = await requireContractorProfile(session);
    const jobs = await prisma.bathroomProject.findMany({
      where: { contractorOwnerId: profile.id },
      orderBy: { updatedAt: "desc" },
      include: {
        proposals: { orderBy: { updatedAt: "desc" }, take: 1 },
        estimates: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { media: true, proposals: true } },
      },
    });
    return NextResponse.json({
      profile: {
        id: profile.id,
        companyName: profile.companyName,
        letterheadPhone: profile.letterheadPhone,
        letterheadEmail: profile.letterheadEmail,
        letterheadAddress: profile.letterheadAddress,
        letterheadTagline: profile.letterheadTagline,
        letterheadLicenseText: profile.letterheadLicenseText,
        proposalFooterText: profile.proposalFooterText,
        contactPerson: profile.contactPerson,
      },
      jobs,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unauthorized" }, { status: e?.status || 403 });
  }
}

export async function POST(req: NextRequest) {
  if (!bathroomContractorStudioEnabled()) {
    return NextResponse.json({ error: "Contractor studio is not enabled." }, { status: 404 });
  }
  const session = await getSession();
  try {
    const profile = await requireContractorProfile(session);
    const body = contractorStudioJobSchema.parse(await req.json());
    const answers = { ...(body.answers || {}) };
    if (body.requirementsPrompt) answers.requirementsPrompt = body.requirementsPrompt;

    const project = await prisma.bathroomProject.create({
      data: {
        referenceNumber: generateReferenceNumber(),
        contractorOwnerId: profile.id,
        homeownerId: null,
        plannerMode: "quick",
        bathroomType: body.bathroomType ?? null,
        projectObjective: body.projectObjective ?? null,
        jobTitle: body.jobTitle || body.clientName || "Bathroom remodel",
        clientName: body.clientName || null,
        clientEmail: body.clientEmail || null,
        clientPhone: body.clientPhone || null,
        answersJson: answers,
        status: "IN_PROGRESS",
        currentStep: "studio",
      },
    });

    await logAuditEvent({
      eventType: "BATHROOM_PROJECT_CREATED",
      description: `Contractor studio job ${project.referenceNumber} created by ${profile.companyName}`,
      actorId: session!.id,
      bathroomProjectId: project.id,
      metadata: { contractorOwnerId: profile.id },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json({ error: e.errors?.[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: e?.message || "Failed" }, { status: e?.status || 500 });
  }
}
