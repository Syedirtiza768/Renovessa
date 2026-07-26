import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, canAccessAdmin } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const projects = await prisma.bathroomProject.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      homeowner: { select: { id: true, email: true, name: true } },
      _count: { select: { estimates: true, briefs: true, layouts: true, proposals: true } },
    },
  });
  return NextResponse.json(projects);
}
