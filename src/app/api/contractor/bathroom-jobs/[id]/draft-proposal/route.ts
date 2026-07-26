import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { bathroomContractorStudioEnabled } from "@/lib/feature-flags";
import { assertContractorOwnsBathroomProject } from "@/lib/bathroom/authorization";
import { proposalDraftPromptSchema } from "@/lib/bathroom/schemas";
import { draftProposalFromPrompt } from "@/lib/bathroom/proposal-draft";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!bathroomContractorStudioEnabled()) {
    return NextResponse.json({ error: "Not enabled" }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id } = await params;
    const { project, profile } = await assertContractorOwnsBathroomProject(session, id);
    const { prompt, seedFromEstimate } = proposalDraftPromptSchema.parse(await req.json());

    let estimateMid: number | null = null;
    if (seedFromEstimate) {
      const est = await prisma.bathroomEstimate.findFirst({
        where: { projectId: id },
        orderBy: { createdAt: "desc" },
      });
      if (est) estimateMid = est.expectedLowAmount;
    }

    const draft = draftProposalFromPrompt({
      prompt,
      companyName: profile.companyName,
      clientName: project.clientName,
      bathroomType: project.bathroomType,
      projectObjective: project.projectObjective,
      estimateMid,
      answers: (project.answersJson as Record<string, string>) || {},
    });

    return NextResponse.json({
      draft: {
        ...draft,
        // Back-compat for older clients: totalPrice only when estimate-seeded.
        totalPrice: draft.suggestedTotalPrice ?? 0,
      },
    });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json({ error: e.errors?.[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: e?.message || "Failed" }, { status: e?.status || 500 });
  }
}
