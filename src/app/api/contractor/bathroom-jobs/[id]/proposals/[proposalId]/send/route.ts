import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { bathroomContractorStudioEnabled } from "@/lib/feature-flags";
import { assertContractorOwnsBathroomProject } from "@/lib/bathroom/authorization";
import { proposalSendSchema } from "@/lib/bathroom/schemas";
import { generateProposalShareToken } from "@/lib/bathroom/proposal-share";
import { absoluteUrl } from "@/lib/seo";

export const runtime = "nodejs";

/**
 * Issue / refresh a secure homeowner share link.
 * Requires APPROVED (or re-send from REVISION_REQUESTED after re-approval → APPROVED).
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

    const existing = await prisma.contractorProposal.findUnique({ where: { id: proposalId } });
    if (!existing || existing.projectId !== id || existing.contractorId !== profile.id) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }
    if (existing.status === "ACCEPTED") {
      return NextResponse.json(
        { error: "Accepted proposals are locked. Create a change order for new scope." },
        { status: 409 },
      );
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

    const needsNewToken = !existing.shareToken || body.rotateToken;
    const token = needsNewToken ? generateProposalShareToken() : existing.shareToken!;
    const shareExpiresAt = new Date(Date.now() + body.expiresDays * 24 * 60 * 60 * 1000);
    const wasSent = Boolean(existing.sentAt);
    const nextVersion = wasSent && existing.status === "APPROVED" ? existing.version + 1 : existing.version;

    const proposal = await prisma.contractorProposal.update({
      where: { id: proposalId },
      data: {
        status: "SENT",
        shareToken: token,
        shareExpiresAt,
        sentAt: new Date(),
        version: nextVersion,
        // Clear prior decline if re-sending a revised proposal
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
      return NextResponse.json({ error: e.errors?.[0]?.message ?? "Invalid input" }, { status: 400 });
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
        status: existing.status === "SENT" || existing.status === "REVISION_REQUESTED" ? "APPROVED" : existing.status,
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
