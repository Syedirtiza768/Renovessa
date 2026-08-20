import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertBathroomProjectAccess } from "@/lib/bathroom/authorization";
import { BATHROOM_PROJECT_BRIEF_ENABLED } from "@/lib/feature-flags";
import { renderBriefPdf } from "@/lib/bathroom/brief-pdf";
import type { ProjectBrief } from "@/lib/bathroom/project-brief";
import { isValidBriefAccessToken } from "@/lib/bathroom/brief-access";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!BATHROOM_PROJECT_BRIEF_ENABLED) {
    return NextResponse.json({ error: "Project brief is not enabled." }, { status: 404 });
  }
  try {
    const { id } = await params;
    const accessToken = req.nextUrl.searchParams.get("token");
    let project;
    let latestBrief;

    // The RFP success page and confirmation email carry a short-lived,
    // download-only token. It keeps the immediate brief useful after the
    // project is claimed by a homeowner account without exposing portal data.
    if (accessToken) {
      const tokenBrief = await prisma.projectBrief.findFirst({
        where: { projectId: id, shareToken: accessToken },
      });
      if (
        tokenBrief &&
        isValidBriefAccessToken({
          token: accessToken,
          storedToken: tokenBrief.shareToken,
          expiresAt: tokenBrief.shareExpiresAt,
        })
      ) {
        latestBrief = tokenBrief;
        project = await prisma.bathroomProject.findUnique({ where: { id } });
      }
    }

    if (!project || !latestBrief) {
      const session = await getSession();
      project = await assertBathroomProjectAccess(session, id);
      latestBrief = await prisma.projectBrief.findFirst({
        where: { projectId: id },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!latestBrief) {
      return NextResponse.json(
        { error: "Generate a project brief before downloading the PDF." },
        { status: 409 },
      );
    }

    const brief = latestBrief.briefJson as unknown as ProjectBrief;
    const doc = renderBriefPdf(brief);

    const chunks: Buffer[] = [];
    for await (const chunk of doc) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const pdf = Buffer.concat(chunks);

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="renovessa-bathroom-brief-${project.referenceNumber}.pdf"`,
        "Content-Length": String(pdf.length),
      },
    });
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Internal error" }, { status });
  }
}
