import { NextRequest, NextResponse } from "next/server";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    projectRequestId, trade, zipCode, leadSource,
    homeownerConfirmed, contractorAttended, estimateGiven,
    disputeOccurred, lessonsLearned, nextImprovement,
  } = body;

  if (!projectRequestId || !trade || !zipCode) {
    return NextResponse.json({ error: "projectRequestId, trade, and zipCode are required" }, { status: 400 });
  }

  const existing = await prisma.caseStudy.findUnique({ where: { projectRequestId } });
  if (existing) {
    const updated = await prisma.caseStudy.update({
      where: { projectRequestId },
      data: {
        trade, zipCode, leadSource,
        homeownerConfirmed: homeownerConfirmed ?? false,
        contractorAttended: contractorAttended ?? false,
        estimateGiven,
        disputeOccurred: disputeOccurred ?? false,
        lessonsLearned,
        nextImprovement,
      },
    });
    return NextResponse.json(updated);
  }

  const caseStudy = await prisma.caseStudy.create({
    data: {
      projectRequestId, trade, zipCode, leadSource,
      homeownerConfirmed: homeownerConfirmed ?? false,
      contractorAttended: contractorAttended ?? false,
      estimateGiven,
      disputeOccurred: disputeOccurred ?? false,
      lessonsLearned,
      nextImprovement,
    },
  });

  return NextResponse.json(caseStudy, { status: 201 });
}
