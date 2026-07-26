import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { bathroomContractorStudioEnabled } from "@/lib/feature-flags";
import { assertContractorOwnsBathroomProject } from "@/lib/bathroom/authorization";
import { proposalSchema } from "@/lib/bathroom/schemas";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; proposalId: string }> },
) {
  if (!bathroomContractorStudioEnabled()) {
    return NextResponse.json({ error: "Not enabled" }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id, proposalId } = await params;
    const { profile } = await assertContractorOwnsBathroomProject(session, id);
    const existing = await prisma.contractorProposal.findUnique({ where: { id: proposalId } });
    if (!existing || existing.projectId !== id || existing.contractorId !== profile.id) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }
    const data = proposalSchema.partial().parse(await req.json());
    const proposal = await prisma.contractorProposal.update({
      where: { id: proposalId },
      data: {
        ...data,
        expirationDate: data.expirationDate === undefined
          ? undefined
          : data.expirationDate
            ? new Date(data.expirationDate)
            : null,
      },
    });
    return NextResponse.json(proposal);
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json({ error: e.errors?.[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: e?.message || "Failed" }, { status: e?.status || 500 });
  }
}
