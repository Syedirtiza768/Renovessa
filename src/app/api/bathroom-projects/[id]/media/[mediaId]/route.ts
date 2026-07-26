import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertBathroomProjectAccess } from "@/lib/bathroom/authorization";
import { bathroomPlannerUsable } from "@/lib/feature-flags";
import { readBathroomUpload } from "@/lib/bathroom/media-storage";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; mediaId: string }> }) {
  if (!bathroomPlannerUsable()) {
    return NextResponse.json({ error: "Bathroom planner is not enabled." }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id, mediaId } = await params;
    await assertBathroomProjectAccess(session, id);
    const media = await prisma.bathroomMedia.findUnique({ where: { id: mediaId } });
    if (!media || media.projectId !== id) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }
    const bytes = await readBathroomUpload(media.storagePath);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": media.mimeType,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": `inline; filename="${media.fileName.replace(/"/g, "")}"`,
      },
    });
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Internal error" }, { status });
  }
}
