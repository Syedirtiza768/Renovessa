import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { bathroomContractorStudioEnabled } from "@/lib/feature-flags";
import { assertContractorOwnsBathroomProject } from "@/lib/bathroom/authorization";
import { proposalApproveSchema } from "@/lib/bathroom/schemas";
import {
  normalizeStudioPricing,
  recalculatePricing,
  type ContractorPricedLineItem,
} from "@/lib/bathroom/contractor-pricing";

export const runtime = "nodejs";

/**
 * Approve a draft proposal so a client PDF can be issued.
 * Records margin warnings and requires acknowledgment when below minimum.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; proposalId: string }> },
) {
  if (!bathroomContractorStudioEnabled()) {
    return NextResponse.json({ error: "Not enabled" }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id, proposalId } = await params;
    const { project, profile } = await assertContractorOwnsBathroomProject(session, id);
    const body = proposalApproveSchema.parse(await req.json().catch(() => ({})));

    const existing = await prisma.contractorProposal.findUnique({ where: { id: proposalId } });
    if (!existing || existing.projectId !== id || existing.contractorId !== profile.id) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }
    if (existing.status === "ACCEPTED") {
      return NextResponse.json({ error: "Already accepted by the client." }, { status: 409 });
    }
    if (!existing.includedScope?.trim() || !existing.exclusions?.trim()) {
      return NextResponse.json(
        { error: "Scope and exclusions are required before approval." },
        { status: 400 },
      );
    }
    if (!existing.totalPrice || existing.totalPrice <= 0) {
      return NextResponse.json(
        { error: "Set a customer total greater than zero before approval." },
        { status: 400 },
      );
    }

    const settings = normalizeStudioPricing({
      ...normalizeStudioPricing(profile.studioPricingJson),
      ...(existing.pricingSnapshotJson as object || {}),
    });

    let margin = existing.grossMarginPercent;
    let belowMin = false;
    if (existing.lineItemsJson && Array.isArray(existing.lineItemsJson)) {
      const priced = recalculatePricing(
        existing.lineItemsJson as ContractorPricedLineItem[],
        settings,
      );
      margin = priced.totals.grossMarginPercent;
      belowMin = priced.totals.belowMinimumMargin;
    } else if (
      existing.directCostTotal != null &&
      existing.totalPrice > 0
    ) {
      const cost =
        (existing.directCostTotal || 0) +
        (existing.overheadAmount || 0) +
        (existing.contingencyAmount || 0);
      margin = ((existing.totalPrice - cost) / existing.totalPrice) * 100;
      belowMin = margin < settings.minimumGrossMarginPercent;
    }

    if (belowMin && !body.acknowledgeBelowMinimumMargin) {
      return NextResponse.json(
        {
          error: `Gross margin ${margin?.toFixed(1)}% is below your minimum ${settings.minimumGrossMarginPercent}%. Acknowledge to override.`,
          code: "BELOW_MINIMUM_MARGIN",
          grossMarginPercent: margin,
          minimumGrossMarginPercent: settings.minimumGrossMarginPercent,
        },
        { status: 422 },
      );
    }

    const proposal = await prisma.contractorProposal.update({
      where: { id: proposalId },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedByUserId: session!.id,
        grossMarginPercent: margin ?? existing.grossMarginPercent,
      },
    });

    await logAuditEvent({
      eventType: "BATHROOM_PROPOSAL_APPROVED",
      description: `Proposal approved for ${project.referenceNumber}`,
      actorId: session!.id,
      bathroomProjectId: id,
      metadata: {
        proposalId,
        totalPrice: proposal.totalPrice,
        grossMarginPercent: margin,
        belowMinimumMargin: belowMin,
        overrideReason: body.overrideReason || null,
      },
    });

    return NextResponse.json({
      proposal,
      note: "Proposal approved. You can download the client PDF.",
    });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json({ error: e.errors?.[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: e?.message || "Failed" }, { status: e?.status || 500 });
  }
}
