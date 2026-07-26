import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { bathroomContractorStudioEnabled } from "@/lib/feature-flags";
import { assertContractorOwnsBathroomProject } from "@/lib/bathroom/authorization";
import { proposalSendSchema } from "@/lib/bathroom/schemas";
import { generateProposalShareToken } from "@/lib/bathroom/proposal-share";
import { normalizeStudioPricing } from "@/lib/bathroom/contractor-pricing";
import {
  buildCommercialFields,
  evaluateMarginGate,
  resolveValidEstimateId,
} from "@/lib/bathroom/proposal-ops";
import { absoluteUrl } from "@/lib/seo";

export const runtime = "nodejs";

const DEFAULT_SCOPE =
  "Provide the bathroom remodel scope discussed with the client, including protection of adjacent finishes, daily cleanup, and haul-away of construction debris.";
const DEFAULT_EXCLUSIONS = [
  "Unforeseen structural, plumbing, or electrical corrections beyond normal remodel allowances.",
  "Homeowner-furnished materials unless listed as contractor-supplied.",
  "Mold remediation, asbestos abatement, or hazardous material handling (priced separately if discovered).",
].join("\n");

/**
 * Issue / refresh a secure homeowner share link.
 * Can persist + approve in the same request when autoApprove is true (default).
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
    const body = proposalSendSchema.parse(await req.json().catch(() => ({})));
    const {
      expiresDays,
      rotateToken,
      acknowledgeBelowMinimumMargin,
      overrideReason,
      autoApprove,
      ...proposalPatch
    } = body;

    let existing = await prisma.contractorProposal.findUnique({ where: { id: proposalId } });
    if (!existing || existing.projectId !== id || existing.contractorId !== profile.id) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }
    if (existing.status === "ACCEPTED") {
      return NextResponse.json(
        { error: "Accepted proposals are locked. Create a change order for new scope." },
        { status: 409 },
      );
    }

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
          status:
            existing.status === "APPROVED" ||
            existing.status === "SENT" ||
            existing.status === "REVISION_REQUESTED"
              ? "DRAFT"
              : existing.status,
          approvedAt: null,
          approvedByUserId: null,
        },
      });
    }

    const needsApprove =
      autoApprove !== false &&
      existing.status !== "APPROVED" &&
      existing.status !== "SENT";

    if (needsApprove) {
      const includedScope = (existing.includedScope || "").trim() || DEFAULT_SCOPE;
      const exclusions = (existing.exclusions || "").trim() || DEFAULT_EXCLUSIONS;

      if (!existing.totalPrice || existing.totalPrice <= 0) {
        return NextResponse.json(
          {
            error:
              "Set a customer total greater than zero before sending. Run an estimate, add priced lines, or enter a package total.",
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

      existing = await prisma.contractorProposal.update({
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
          totalPrice: existing.totalPrice,
          grossMarginPercent: margin,
          belowMinimumMargin: belowMin,
          overrideReason: overrideReason || null,
          via: "send",
        },
      });
    }

    if (existing.status !== "APPROVED" && existing.status !== "SENT") {
      return NextResponse.json(
        { error: "Approve the proposal before sending a client link." },
        { status: 400 },
      );
    }
    if (!existing.totalPrice || existing.totalPrice <= 0) {
      return NextResponse.json({ error: "Customer total must be greater than zero." }, { status: 400 });
    }

    const needsNewToken = !existing.shareToken || rotateToken;
    const token = needsNewToken ? generateProposalShareToken() : existing.shareToken!;
    const shareExpiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000);
    const wasSent = Boolean(existing.sentAt);
    const nextVersion =
      wasSent && existing.status === "APPROVED" ? existing.version + 1 : existing.version;

    const proposal = await prisma.contractorProposal.update({
      where: { id: proposalId },
      data: {
        status: "SENT",
        shareToken: token,
        shareExpiresAt,
        sentAt: new Date(),
        version: nextVersion,
        declinedAt: null,
        acceptedAt: null,
        acceptanceSnapshotJson: Prisma.DbNull,
        acceptanceName: null,
        acceptanceEmail: null,
        acceptanceIp: null,
        expirationDate: shareExpiresAt,
      },
    });

    const sharePath = `/proposal/${token}`;
    const shareUrl = absoluteUrl(sharePath);

    await logAuditEvent({
      eventType: "BATHROOM_PROPOSAL_SENT",
      description: `Proposal link sent for ${project.referenceNumber}`,
      actorId: session!.id,
      bathroomProjectId: id,
      metadata: {
        proposalId,
        version: proposal.version,
        shareExpiresAt: shareExpiresAt.toISOString(),
        companyName: profile.companyName,
      },
    });

    return NextResponse.json({
      proposal,
      shareToken: token,
      shareUrl,
      sharePath,
      shareExpiresAt: shareExpiresAt.toISOString(),
      note: "Share this link with your client. They can review, ask questions, accept, or decline without creating an account.",
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

/** Revoke the homeowner share link. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; proposalId: string }> },
) {
  if (!bathroomContractorStudioEnabled()) {
    return NextResponse.json({ error: "Not enabled" }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id, proposalId } = await params;
    const { project } = await assertContractorOwnsBathroomProject(session, id);
    const existing = await prisma.contractorProposal.findUnique({ where: { id: proposalId } });
    if (!existing || existing.projectId !== id) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }
    if (existing.status === "ACCEPTED") {
      return NextResponse.json({ error: "Cannot revoke an accepted proposal link." }, { status: 409 });
    }

    const proposal = await prisma.contractorProposal.update({
      where: { id: proposalId },
      data: {
        shareToken: null,
        shareExpiresAt: null,
        status:
          existing.status === "SENT" || existing.status === "REVISION_REQUESTED"
            ? "APPROVED"
            : existing.status,
      },
    });

    await logAuditEvent({
      eventType: "BATHROOM_SHARE_LINK_REVOKED",
      description: `Proposal share revoked for ${project.referenceNumber}`,
      actorId: session!.id,
      bathroomProjectId: id,
      metadata: { proposalId },
    });

    return NextResponse.json({ proposal, revoked: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: e?.status || 500 });
  }
}
