import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertAdminAccess } from "@/lib/authorization";
import { prisma } from "@/lib/db";

/** Lists all tags with usage counts. */
export async function GET() {
  const session = await getSession();
  try {
    await assertAdminAccess(session);
    const tags = await prisma.contactTag.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { assignments: true } } },
    });
    return NextResponse.json(tags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      count: t._count.assignments,
    })));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load tags" }, { status: e?.status || 500 });
  }
}

/** Creates a new tag. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  try {
    await assertAdminAccess(session);
    const { name, color } = await req.json();
    if (!name) return NextResponse.json({ error: "Tag name is required" }, { status: 400 });

    const tag = await prisma.contactTag.create({
      data: { name: name.trim(), color: color || "#b5541e" },
    });
    return NextResponse.json(tag, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Tag name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: e?.message || "Failed to create tag" }, { status: e?.status || 500 });
  }
}
