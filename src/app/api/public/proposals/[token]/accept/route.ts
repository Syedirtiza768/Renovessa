import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";
import { bathroomContractorStudioEnabled } from "@/lib/feature-flags";
import { proposalAcceptSchema } from "@/lib/bathroom/schemas";
import {
  buildAcceptanceSnapshot,
  buildCustomerFacingProposal,
  isProposalShareViewable,
} from "@/lib/bathroom/proposal-share";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  if (!bathroomContractorStudioEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const { token } = await params;
    const body = proposalAcceptSchema.parse(await req.json());
    const row = await prisma.contractorProposal.findUnique({
      where: { shareToken: token },
      include: { project: true, contractor: true, clientMessages: true },
    });
    if (!row || !isProposalShareViewable(row.status)) {
      return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
    }

    const view = buildCustomerFacingProposal({
      proposal: row,
      project: row.project,
      contractor: row.contractor,
      messages: row.clientMessages,
    });
    if (!view.canAccept) {
      return NextResponse.json(
        {
          error: view.expired
            ? "This proposal has expired. Ask the contractor for an updated link."
            : "This proposal can no longer be accepted.",
        },
        { status: 409 },
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const snapshot = buildAcceptanceSnapshot(view);

    const proposal = await prisma.contractorProposal.update({
      where: { id: row.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptanceName: body.fullName,
        acceptanceEmail: body.email,
        acceptanceIp: ip,
        acceptanceSnapshotJson: snapshot as any,
        declinedAt: null,
      },
    });

    if (body.notes?.trim()) {
      await prisma.contractorProposalMessage.create({
        data: {
          proposalId: row.id,
          kind: "question",
          body: `Acceptance note: ${body.notes.trim()}`,
          authorName: body.fullName,
          authorEmail: body.email,
          ipAddress: ip,
        },
      });
    }

    await logAuditEvent({
      eventType: "BATHROOM_PROPOSAL_ACCEPTED",
      description: `Proposal accepted for ${row.project.referenceNumber}`,
      bathroomProjectId: row.projectId,
      metadata: {
        proposalId: row.id,
        version: row.version,
        acceptanceName: body.fullName,
        totalPrice: row.totalPrice,
      },
    });

    return NextResponse.json({
      ok: true,
      status: proposal.status,
      acceptedAt: proposal.acceptedAt,
      version: proposal.version,
      note: "Thank you. Your acceptance has been recorded. The contractor will follow up to schedule work.",
    });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json({ error: e.errors?.[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
