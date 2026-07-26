import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { bathroomContractorStudioEnabled } from "@/lib/feature-flags";
import { assertContractorOwnsBathroomProject } from "@/lib/bathroom/authorization";
import { proposalSchema } from "@/lib/bathroom/schemas";
import { normalizeStudioPricing } from "@/lib/bathroom/contractor-pricing";
import { buildCommercialFields, resolveValidEstimateId } from "@/lib/bathroom/proposal-ops";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!bathroomContractorStudioEnabled()) {
    return NextResponse.json({ error: "Not enabled" }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id } = await params;
    const { profile } = await assertContractorOwnsBathroomProject(session, id);
    const proposals = await prisma.contractorProposal.findMany({
      where: { projectId: id, contractorId: profile.id },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({
      proposals,
      pricingSettings: normalizeStudioPricing(profile.studioPricingJson),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: e?.status || 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!bathroomContractorStudioEnabled()) {
    return NextResponse.json({ error: "Not enabled" }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id } = await params;
    const { project, profile } = await assertContractorOwnsBathroomProject(session, id);
    const data = proposalSchema.parse(await req.json());
    const commercial = buildCommercialFields(data, profile.studioPricingJson);
    const estimateId = await resolveValidEstimateId(id, data.estimateId);

    const proposal = await prisma.contractorProposal.create({
      data: {
        projectId: id,
        contractorId: profile.id,
        status: "DRAFT",
        version: 1,
        mode: data.mode ?? "detailed",
        estimateId,
        totalPrice: commercial.totalPrice ?? 0,
        directCostTotal: commercial.directCostTotal,
        overheadAmount: commercial.overheadAmount,
        contingencyAmount: commercial.contingencyAmount,
        profitAmount: commercial.profitAmount,
        grossMarginPercent: commercial.grossMarginPercent,
        markupPercent: commercial.markupPercent,
        lineItemsJson: commercial.lineItemsJson as object | undefined,
        pricingSnapshotJson: commercial.pricingSnapshotJson as object,
        includedScope: data.includedScope,
        exclusions: data.exclusions,
        materialAllowances: data.materialAllowances ?? null,
        fixtureAllowances: data.fixtureAllowances ?? null,
        permitHandling: data.permitHandling ?? null,
        estimatedStartDate: data.estimatedStartDate ?? null,
        estimatedDuration: data.estimatedDuration ?? null,
        paymentSchedule: data.paymentSchedule ?? null,
        warranty: data.warranty ?? null,
        changeOrderProcess: data.changeOrderProcess ?? null,
        optionalUpgrades: data.optionalUpgrades ?? null,
        suggestedChanges: data.suggestedChanges ?? null,
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
        proposalDocumentUrl: data.proposalDocumentUrl ?? null,
      },
    });

    await prisma.bathroomProject.update({
      where: { id },
      data: { status: "PROPOSAL_RECEIVED" },
    });

    await logAuditEvent({
      eventType: "BATHROOM_PROPOSAL_SUBMITTED",
      description: `Studio draft proposal for ${project.referenceNumber} by ${profile.companyName}`,
      actorId: session!.id,
      bathroomProjectId: id,
      metadata: {
        proposalId: proposal.id,
        totalPrice: proposal.totalPrice,
        status: proposal.status,
        margin: proposal.grossMarginPercent,
      },
    });

    return NextResponse.json(proposal, { status: 201 });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      const issue = e.errors?.[0];
      const path = issue?.path?.join(".") || "input";
      return NextResponse.json(
        { error: issue?.message ? `${path}: ${issue.message}` : "Invalid input" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: e?.message || "Failed" }, { status: e?.status || 500 });
  }
}
