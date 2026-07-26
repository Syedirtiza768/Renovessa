import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertBathroomProjectAccess } from "@/lib/bathroom/authorization";
import { BATHROOM_PROJECT_BRIEF_ENABLED } from "@/lib/feature-flags";
import { renderBriefPdf } from "@/lib/bathroom/brief-pdf";
import type { ProjectBrief } from "@/lib/bathroom/project-brief";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!BATHROOM_PROJECT_BRIEF_ENABLED) {
    return NextResponse.json({ error: "Project brief is not enabled." }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id } = await params;
    const project = await assertBathroomProjectAccess(session, id);

    const latestBrief = await prisma.projectBrief.findFirst({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });

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
