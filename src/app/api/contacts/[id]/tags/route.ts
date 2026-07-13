import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertAdminAccess } from "@/lib/authorization";
import { prisma } from "@/lib/db";

/** Assigns tags to a contact. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  try {
    await assertAdminAccess(session);
    const { id } = await params;
    const { tagIds } = await req.json();
    if (!Array.isArray(tagIds)) return NextResponse.json({ error: "tagIds array required" }, { status: 400 });

    await prisma.contactTagInquiry.createMany({
      data: tagIds.map((tagId: string) => ({ tagId, inquiryId: id })),
      skipDuplicates: true,
    });

    const tags = await prisma.contactTagInquiry.findMany({
      where: { inquiryId: id },
      include: { tag: true },
    });
    return NextResponse.json(tags.map((t) => ({ id: t.tag.id, name: t.tag.name, color: t.tag.color })));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to assign tags" }, { status: e?.status || 500 });
  }
}

/** Removes tags from a contact. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  try {
    await assertAdminAccess(session);
    const { id } = await params;
    const { tagIds } = await req.json();
    if (!Array.isArray(tagIds)) return NextResponse.json({ error: "tagIds array required" }, { status: 400 });

    await prisma.contactTagInquiry.deleteMany({
      where: { inquiryId: id, tagId: { in: tagIds } },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to remove tags" }, { status: e?.status || 500 });
  }
}
