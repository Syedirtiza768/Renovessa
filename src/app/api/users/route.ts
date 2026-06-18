import { NextRequest, NextResponse } from "next/server";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const roleFilter = searchParams.get("role");

  const OPS_ROLES = ["SUPER_ADMIN", "OPS_AGENT", "SCHEDULER", "OPS_MANAGER"];

  const where =
    roleFilter === "ops"
      ? { role: { in: OPS_ROLES as any[] } }
      : {};

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}
