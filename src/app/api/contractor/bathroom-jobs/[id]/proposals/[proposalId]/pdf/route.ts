import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { bathroomContractorStudioEnabled } from "@/lib/feature-flags";
import { assertContractorOwnsBathroomProject } from "@/lib/bathroom/authorization";
import { pdfToBuffer, renderContractorProposalPdf } from "@/lib/bathroom/proposal-pdf";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; proposalId: string }> },
) {
  if (!bathroomContractorStudioEnabled()) {
    return NextResponse.json({ error: "Not enabled" }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id, proposalId } = await params;
    const { project, profile } = await assertContractorOwnsBathroomProject(session, id);
    const proposal = await prisma.contractorProposal.findUnique({ where: { id: proposalId } });
    if (!proposal || proposal.projectId !== id || proposal.contractorId !== profile.id) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const doc = renderContractorProposalPdf({
      letterhead: {
        companyName: profile.companyName,
        contactPerson: profile.contactPerson,
        letterheadPhone: profile.letterheadPhone,
        letterheadEmail: profile.letterheadEmail,
        letterheadAddress: profile.letterheadAddress,
        letterheadTagline: profile.letterheadTagline,
        letterheadLicenseText: profile.letterheadLicenseText,
        proposalFooterText: profile.proposalFooterText,
      },
      job: {
        referenceNumber: project.referenceNumber,
        jobTitle: project.jobTitle,
        clientName: project.clientName,
        clientEmail: project.clientEmail,
        clientPhone: project.clientPhone,
        bathroomType: project.bathroomType,
        projectObjective: project.projectObjective,
      },
      proposal,
    });

    const buf = await pdfToBuffer(doc);
    const filename = `${profile.companyName.replace(/[^a-zA-Z0-9]+/g, "_")}_Proposal_${project.referenceNumber}.pdf`;
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: e?.status || 500 });
  }
}
