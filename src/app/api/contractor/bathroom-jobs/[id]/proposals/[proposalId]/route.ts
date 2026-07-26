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
    const estimateId =
      data.estimateId === undefined ? undefined : await resolveValidEstimateId(id, data.estimateId);
    const commercial = buildCommercialFields(data, {
      ...normalizeStudioPricing(profile.studioPricingJson),
      ...(existing.pricingSnapshotJson as object || {}),
    });

    const wasIssued =
      existing.status === "APPROVED" ||
      existing.status === "SENT" ||
      existing.status === "REVISION_REQUESTED";
    const nextStatus = wasIssued ? "DRAFT" : existing.status;

    const hasCommercial =
      data.lineItems !== undefined ||
      data.totalPrice !== undefined ||
      data.recomputeFromLines ||
      data.pricingSettings !== undefined;

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
        estimateId,
        mode: data.mode,
        expirationDate:
          data.expirationDate === undefined
            ? undefined
            : data.expirationDate
              ? new Date(data.expirationDate)
              : null,
        ...(hasCommercial
          ? {
              totalPrice: commercial.totalPrice ?? existing.totalPrice,
              directCostTotal: commercial.directCostTotal,
              overheadAmount: commercial.overheadAmount,
              contingencyAmount: commercial.contingencyAmount,
              profitAmount: commercial.profitAmount,
              grossMarginPercent: commercial.grossMarginPercent,
              markupPercent: commercial.markupPercent,
              lineItemsJson: commercial.lineItemsJson as object | undefined,
              pricingSnapshotJson: commercial.pricingSnapshotJson as object,
            }
          : {}),
        status: nextStatus,
        approvedAt: wasIssued ? null : undefined,
        approvedByUserId: wasIssued ? null : undefined,
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
