import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { bathroomContractorStudioEnabled } from "@/lib/feature-flags";
import { assertContractorOwnsBathroomProject } from "@/lib/bathroom/authorization";
import { contractorStudioJobSchema } from "@/lib/bathroom/schemas";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!bathroomContractorStudioEnabled()) {
    return NextResponse.json({ error: "Contractor studio is not enabled." }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id } = await params;
    const { project, profile } = await assertContractorOwnsBathroomProject(session, id);
    const full = await prisma.bathroomProject.findUnique({
      where: { id: project.id },
      include: {
        proposals: { orderBy: { updatedAt: "desc" } },
        estimates: { orderBy: { createdAt: "desc" }, take: 3 },
        media: { orderBy: { createdAt: "desc" }, take: 20 },
        layouts: { orderBy: { createdAt: "desc" }, take: 4 },
      },
    });
    return NextResponse.json({ project: full, profile });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: e?.status || 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!bathroomContractorStudioEnabled()) {
    return NextResponse.json({ error: "Contractor studio is not enabled." }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id } = await params;
    await assertContractorOwnsBathroomProject(session, id);
    const body = contractorStudioJobSchema.partial().extend({
      answers: contractorStudioJobSchema.shape.answers.optional(),
    }).parse(await req.json());

    const existing = await prisma.bathroomProject.findUnique({ where: { id } });
    const prevAnswers = (existing?.answersJson as Record<string, string> | null) ?? {};
    const nextAnswers = { ...prevAnswers, ...(body.answers || {}) };
    if (body.requirementsPrompt) nextAnswers.requirementsPrompt = body.requirementsPrompt;

    const project = await prisma.bathroomProject.update({
      where: { id },
      data: {
        jobTitle: body.jobTitle ?? undefined,
        clientName: body.clientName ?? undefined,
        clientEmail: body.clientEmail === "" ? null : body.clientEmail ?? undefined,
        clientPhone: body.clientPhone ?? undefined,
        bathroomType: body.bathroomType ?? undefined,
        projectObjective: body.projectObjective ?? undefined,
        answersJson: nextAnswers,
      },
    });
    return NextResponse.json(project);
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json({ error: e.errors?.[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: e?.message || "Failed" }, { status: e?.status || 500 });
  }
}
