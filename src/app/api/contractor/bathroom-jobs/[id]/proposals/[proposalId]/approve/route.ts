import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { bathroomContractorStudioEnabled } from "@/lib/feature-flags";
import { assertContractorOwnsBathroomProject } from "@/lib/bathroom/authorization";
import { proposalApproveSchema } from "@/lib/bathroom/schemas";
import { normalizeStudioPricing } from "@/lib/bathroom/contractor-pricing";
import {
  buildCommercialFields,
  evaluateMarginGate,
  resolveValidEstimateId,
} from "@/lib/bathroom/proposal-ops";

export const runtime = "nodejs";

const DEFAULT_SCOPE =
  "Provide the bathroom remodel scope discussed with the client, including protection of adjacent finishes, daily cleanup, and haul-away of construction debris.";
const DEFAULT_EXCLUSIONS = [
  "Unforeseen structural, plumbing, or electrical corrections beyond normal remodel allowances.",
  "Homeowner-furnished materials unless listed as contractor-supplied.",
  "Mold remediation, asbestos abatement, or hazardous material handling (priced separately if discovered).",
].join("\n");

/**
 * Persist (optional body) + approve so client PDF / share link can be issued.
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
    const {
      acknowledgeBelowMinimumMargin,
      overrideReason,
      ...proposalPatch
    } = body;

    let existing = await prisma.contractorProposal.findUnique({ where: { id: proposalId } });
    if (!existing || existing.projectId !== id || existing.contractorId !== profile.id) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }
    if (existing.status === "ACCEPTED") {
      return NextResponse.json({ error: "Already accepted by the client." }, { status: 409 });
    }

    // Persist any commercial/content fields sent with approve (avoids stale draft).
    const hasPatch = Object.keys(proposalPatch).length > 0;
    if (hasPatch) {
      const estimateId =
        proposalPatch.estimateId === undefined
          ? undefined
          : await resolveValidEstimateId(id, proposalPatch.estimateId);
      const commercial = buildCommercialFields(proposalPatch, {
        ...normalizeStudioPricing(profile.studioPricingJson),
        ...(existing.pricingSnapshotJson as object || {}),
      });
      const wasIssued =
        existing.status === "APPROVED" ||
        existing.status === "SENT" ||
        existing.status === "REVISION_REQUESTED";

      existing = await prisma.contractorProposal.update({
        where: { id: proposalId },
        data: {
          includedScope: proposalPatch.includedScope,
          exclusions: proposalPatch.exclusions,
          materialAllowances: proposalPatch.materialAllowances,
          fixtureAllowances: proposalPatch.fixtureAllowances,
          permitHandling: proposalPatch.permitHandling,
          estimatedStartDate: proposalPatch.estimatedStartDate,
          estimatedDuration: proposalPatch.estimatedDuration,
          paymentSchedule: proposalPatch.paymentSchedule,
          warranty: proposalPatch.warranty,
          changeOrderProcess: proposalPatch.changeOrderProcess,
          optionalUpgrades: proposalPatch.optionalUpgrades,
          suggestedChanges: proposalPatch.suggestedChanges,
          estimateId,
          mode: proposalPatch.mode,
          ...(commercial.totalPrice !== undefined
            ? {
                totalPrice: commercial.totalPrice,
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
          status: wasIssued ? "DRAFT" : existing.status,
          approvedAt: wasIssued ? null : undefined,
          approvedByUserId: wasIssued ? null : undefined,
        },
      });
    }

    const includedScope = (existing.includedScope || "").trim() || DEFAULT_SCOPE;
    const exclusions = (existing.exclusions || "").trim() || DEFAULT_EXCLUSIONS;
    if (!existing.includedScope?.trim() || !existing.exclusions?.trim()) {
      existing = await prisma.contractorProposal.update({
        where: { id: proposalId },
        data: { includedScope, exclusions },
      });
    }

    if (!existing.totalPrice || existing.totalPrice <= 0) {
      return NextResponse.json(
        {
          error:
            "Set a customer total greater than zero before approval. Run an estimate, add priced line items, or enter a package total.",
          code: "ZERO_TOTAL",
        },
        { status: 400 },
      );
    }

    const settings = normalizeStudioPricing({
      ...normalizeStudioPricing(profile.studioPricingJson),
      ...(existing.pricingSnapshotJson as object || {}),
    });

    const { margin, belowMin } = evaluateMarginGate({
      lineItemsJson: existing.lineItemsJson,
      totalPrice: existing.totalPrice,
      directCostTotal: existing.directCostTotal,
      overheadAmount: existing.overheadAmount,
      contingencyAmount: existing.contingencyAmount,
      grossMarginPercent: existing.grossMarginPercent,
      settings,
    });

    if (belowMin && !acknowledgeBelowMinimumMargin) {
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
        includedScope,
        exclusions,
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
        overrideReason: overrideReason || null,
      },
    });

    return NextResponse.json({
      proposal,
      note: "Proposal approved. You can send the client link.",
    });
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
