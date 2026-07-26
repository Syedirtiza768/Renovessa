import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { bathroomContractorStudioEnabled } from "@/lib/feature-flags";
import { assertContractorOwnsBathroomProject } from "@/lib/bathroom/authorization";
import { proposalSchema } from "@/lib/bathroom/schemas";
import {
  normalizeStudioPricing,
  recalculatePricing,
  type ContractorPricedLineItem,
} from "@/lib/bathroom/contractor-pricing";

export const runtime = "nodejs";

function buildCommercialFields(
  data: ReturnType<typeof proposalSchema.parse>,
  profilePricing: unknown,
) {
  const settings = normalizeStudioPricing({
    ...normalizeStudioPricing(profilePricing),
    ...(data.pricingSettings || {}),
  });

  if (data.lineItems?.length && (data.recomputeFromLines || data.lineItems)) {
    const priced = recalculatePricing(data.lineItems as ContractorPricedLineItem[], settings);
    return {
      totalPrice: priced.totals.customerTotal,
      directCostTotal: priced.totals.directCostTotal,
      overheadAmount: priced.totals.overheadAmount,
      contingencyAmount: priced.totals.contingencyAmount,
      profitAmount: priced.totals.profitAmount,
      grossMarginPercent: priced.totals.grossMarginPercent,
      markupPercent: priced.totals.markupPercent,
      lineItemsJson: priced.lineItems,
      pricingSnapshotJson: settings,
    };
  }

  return {
    totalPrice: data.totalPrice,
    directCostTotal: null as number | null,
    overheadAmount: null as number | null,
    contingencyAmount: null as number | null,
    profitAmount: null as number | null,
    grossMarginPercent: null as number | null,
    markupPercent: settings.markupPercent,
    lineItemsJson: data.lineItems ?? undefined,
    pricingSnapshotJson: settings,
  };
}

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

    const proposal = await prisma.contractorProposal.create({
      data: {
        projectId: id,
        contractorId: profile.id,
        status: "DRAFT",
        version: 1,
        mode: data.mode ?? "detailed",
        estimateId: data.estimateId ?? null,
        totalPrice: commercial.totalPrice,
        directCostTotal: commercial.directCostTotal,
        overheadAmount: commercial.overheadAmount,
        contingencyAmount: commercial.contingencyAmount,
        profitAmount: commercial.profitAmount,
        grossMarginPercent: commercial.grossMarginPercent,
        markupPercent: commercial.markupPercent,
        lineItemsJson: commercial.lineItemsJson as any,
        pricingSnapshotJson: commercial.pricingSnapshotJson as any,
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
      return NextResponse.json({ error: e.errors?.[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: e?.message || "Failed" }, { status: e?.status || 500 });
  }
}
