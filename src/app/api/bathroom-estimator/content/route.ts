import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { contentVersionSchema } from "@/lib/bathroom/schemas";

export async function GET() {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await prisma.bathroomContentVersion.findMany({
    orderBy: { lastUpdatedAt: "desc" },
    take: 100,
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const data = contentVersionSchema.parse(await req.json());
    const upserted = await prisma.bathroomContentVersion.upsert({
      where: { slug: data.slug },
      create: {
        slug: data.slug,
        title: data.title,
        bodyHtml: data.bodyHtml,
        bodyText: data.bodyText,
        author: data.author ?? null,
        reviewer: data.reviewer ?? null,
        methodology: data.methodology ?? null,
        sourceLinks: data.sourceLinks,
        editorialNotes: data.editorialNotes ?? null,
        applicableLocation: data.applicableLocation ?? null,
        applicableTrade: data.applicableTrade ?? null,
        status: data.status,
        lastReviewedAt: new Date(),
      },
      update: {
        title: data.title,
        bodyHtml: data.bodyHtml,
        bodyText: data.bodyText,
        author: data.author ?? null,
        reviewer: data.reviewer ?? null,
        methodology: data.methodology ?? null,
        sourceLinks: data.sourceLinks,
        editorialNotes: data.editorialNotes ?? null,
        applicableLocation: data.applicableLocation ?? null,
        applicableTrade: data.applicableTrade ?? null,
        status: data.status,
        lastReviewedAt: new Date(),
      },
    });
    return NextResponse.json(upserted, { status: 201 });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json({ error: e.errors?.[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: e?.message || "Failed to save content" }, { status: 500 });
  }
}
