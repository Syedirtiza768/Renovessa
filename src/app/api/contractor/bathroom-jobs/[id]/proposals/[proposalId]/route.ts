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
    if (existing.status === "ACCEPTED") {
      return NextResponse.json(
        { error: "Accepted proposals are locked. Create a revision or change order instead." },
        { status: 409 },
      );
    }

    const data = proposalSchema.partial().parse(await req.json());
    const settings = normalizeStudioPricing({
      ...normalizeStudioPricing(profile.studioPricingJson),
      ...(existing.pricingSnapshotJson as object || {}),
      ...(data.pricingSettings || {}),
    });

    let commercial: Record<string, unknown> = {};
    if (data.lineItems?.length) {
      const priced = recalculatePricing(data.lineItems as ContractorPricedLineItem[], settings);
      commercial = {
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
    } else if (data.totalPrice !== undefined) {
      commercial = { totalPrice: data.totalPrice };
    }

    // Editing an approved/sent proposal returns it to draft (must re-approve + re-send).
    const wasIssued =
      existing.status === "APPROVED" ||
      existing.status === "SENT" ||
      existing.status === "REVISION_REQUESTED";
    const nextStatus = wasIssued ? "DRAFT" : existing.status;

    const proposal = await prisma.contractorProposal.update({
      where: { id: proposalId },
      data: {
        includedScope: data.includedScope,
        exclusions: data.exclusions,
        materialAllowances: data.materialAllowances,
        fixtureAllowances: data.fixtureAllowances,
        permitHandling: data.permitHandling,
        estimatedStartDate: data.estimatedStartDate,
        estimatedDuration: data.estimatedDuration,
        paymentSchedule: data.paymentSchedule,
        warranty: data.warranty,
        changeOrderProcess: data.changeOrderProcess,
        optionalUpgrades: data.optionalUpgrades,
        suggestedChanges: data.suggestedChanges,
        estimateId: data.estimateId === undefined ? undefined : data.estimateId,
        mode: data.mode,
        expirationDate:
          data.expirationDate === undefined
            ? undefined
            : data.expirationDate
              ? new Date(data.expirationDate)
              : null,
        ...commercial,
        status: nextStatus,
        approvedAt: wasIssued ? null : undefined,
        approvedByUserId: wasIssued ? null : undefined,
        // Keep share token until re-send, but public view only works for SENT+ statuses
      },
    });

    if (wasIssued) {
      await logAuditEvent({
        eventType: "BATHROOM_PROPOSAL_REVISED",
        description: `Issued proposal ${proposalId} edited — returned to draft`,
        actorId: session!.id,
        bathroomProjectId: id,
        metadata: { proposalId, previousStatus: existing.status },
      });
    }

    return NextResponse.json(proposal);
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json({ error: e.errors?.[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: e?.message || "Failed" }, { status: e?.status || 500 });
  }
}
