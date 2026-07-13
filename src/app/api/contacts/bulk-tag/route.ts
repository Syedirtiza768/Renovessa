import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertAdminAccess } from "@/lib/authorization";
import { prisma } from "@/lib/db";

/** Bulk assign/remove tags from multiple contacts. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  try {
    await assertAdminAccess(session);
    const { contactIds, tagIds, action } = await req.json();

    if (!Array.isArray(contactIds) || !Array.isArray(tagIds)) {
      return NextResponse.json({ error: "contactIds and tagIds arrays required" }, { status: 400 });
    }

    if (action === "remove") {
      await prisma.contactTagInquiry.deleteMany({
        where: { inquiryId: { in: contactIds }, tagId: { in: tagIds } },
      });
    } else {
      // assign
      const data = contactIds.flatMap((inquiryId: string) =>
        tagIds.map((tagId: string) => ({ tagId, inquiryId }))
      );
      await prisma.contactTagInquiry.createMany({ data, skipDuplicates: true });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to update tags" }, { status: e?.status || 500 });
  }
}
