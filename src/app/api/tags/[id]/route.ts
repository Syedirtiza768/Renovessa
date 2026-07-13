import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertAdminAccess } from "@/lib/authorization";
import { prisma } from "@/lib/db";

/** Updates a tag. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  try {
    await assertAdminAccess(session);
    const { id } = await params;
    const { name, color } = await req.json();

    const tag = await prisma.contactTag.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(color !== undefined && { color }),
      },
    });
    return NextResponse.json(tag);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to update tag" }, { status: e?.status || 500 });
  }
}

/** Deletes a tag. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  try {
    await assertAdminAccess(session);
    const { id } = await params;
    await prisma.contactTag.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to delete tag" }, { status: e?.status || 500 });
  }
}
