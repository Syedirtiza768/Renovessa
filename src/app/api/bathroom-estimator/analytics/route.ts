import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, canAccessAdmin } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    totalProjects,
    projectsWithEstimate,
    projectsWithBrief,
    projectsWithRfq,
    estimates,
    confidenceDistribution,
    objectiveDistribution,
    bathroomTypeDistribution,
    recentEvents,
  ] = await Promise.all([
    prisma.bathroomProject.count(),
    prisma.bathroomProject.count({ where: { estimates: { some: {} } } }),
    prisma.bathroomProject.count({ where: { briefs: { some: {} } } }),
    prisma.bathroomProject.count({ where: { NOT: { projectRequestId: null } } }),
    prisma.bathroomEstimate.findMany({ select: { lowAmount: true, highComplexityAmount: true, confidenceLevel: true }, take: 500 }),
    prisma.bathroomEstimate.groupBy({ by: ["confidenceLevel"], _count: true }),
    prisma.bathroomProject.groupBy({ by: ["projectObjective"], _count: true }),
    prisma.bathroomProject.groupBy({ by: ["bathroomType"], _count: true }),
    prisma.auditEvent.findMany({
      where: { bathroomProjectId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { eventType: true, description: true, createdAt: true, actorId: true },
    }),
  ]);

  const avgEstimate = estimates.length
    ? {
        low: Math.round(estimates.reduce((s, e) => s + e.lowAmount, 0) / estimates.length),
        high: Math.round(estimates.reduce((s, e) => s + e.highComplexityAmount, 0) / estimates.length),
      }
    : null;

  return NextResponse.json({
    totalProjects,
    projectsWithEstimate,
    projectsWithBrief,
    projectsWithRfq,
    rfqConversionRate: totalProjects ? Math.round((projectsWithRfq / totalProjects) * 100) : 0,
    briefConversionRate: totalProjects ? Math.round((projectsWithBrief / totalProjects) * 100) : 0,
    estimateConversionRate: totalProjects ? Math.round((projectsWithEstimate / totalProjects) * 100) : 0,
    avgEstimate,
    confidenceDistribution,
    objectiveDistribution,
    bathroomTypeDistribution,
    recentEvents,
  });
}
