import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { assertBathroomProjectAccess } from "@/lib/bathroom/authorization";
import { bathroomPlannerUsable } from "@/lib/feature-flags";
import {
  saveBathroomUpload,
  deleteBathroomUpload,
  MAX_PHOTOS_PER_PROJECT,
  ALLOWED_MIME,
  MAX_UPLOAD_BYTES,
} from "@/lib/bathroom/media-storage";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!bathroomPlannerUsable()) {
    return NextResponse.json({ error: "Bathroom planner is not enabled." }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id } = await params;
    await assertBathroomProjectAccess(session, id);
    const media = await prisma.bathroomMedia.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        kind: true,
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        caption: true,
        wallLabel: true,
        createdAt: true,
      },
    });
    return NextResponse.json({
      media: media.map((m) => ({
        ...m,
        url: `/api/bathroom-projects/${id}/media/${m.id}`,
      })),
    });
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Internal error" }, { status });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!bathroomPlannerUsable()) {
    return NextResponse.json({ error: "Bathroom planner is not enabled." }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id } = await params;
    await assertBathroomProjectAccess(session, id);

    const existingCount = await prisma.bathroomMedia.count({ where: { projectId: id } });
    if (existingCount >= MAX_PHOTOS_PER_PROJECT) {
      return NextResponse.json(
        { error: `Maximum ${MAX_PHOTOS_PER_PROJECT} photos per project.` },
        { status: 400 },
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing file field." }, { status: 400 });
    }

    const mimeType = file.type || "application/octet-stream";
    if (!ALLOWED_MIME.has(mimeType)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, WebP, or HEIC images are allowed." },
        { status: 400 },
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Each photo must be 10 MB or smaller." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const saved = await saveBathroomUpload({
      projectId: id,
      mimeType,
      bytes,
      originalName: file.name || "photo.jpg",
    });

    const caption = typeof form.get("caption") === "string" ? String(form.get("caption")).slice(0, 200) : null;
    const wallLabel = typeof form.get("wallLabel") === "string" ? String(form.get("wallLabel")).slice(0, 80) : null;
    const kind = typeof form.get("kind") === "string" ? String(form.get("kind")).slice(0, 40) : "photo";

    const media = await prisma.bathroomMedia.create({
      data: {
        projectId: id,
        kind,
        fileName: saved.fileName,
        mimeType,
        sizeBytes: bytes.length,
        storagePath: saved.storagePath,
        caption,
        wallLabel,
      },
    });

    await logAuditEvent({
      eventType: "BATHROOM_PHOTO_UPLOADED",
      description: `Photo uploaded for bathroom project (${media.fileName})`,
      actorId: session?.id,
      bathroomProjectId: id,
      metadata: { mediaId: media.id, mimeType, sizeBytes: bytes.length },
    });

    return NextResponse.json(
      {
        id: media.id,
        kind: media.kind,
        fileName: media.fileName,
        mimeType: media.mimeType,
        sizeBytes: media.sizeBytes,
        caption: media.caption,
        wallLabel: media.wallLabel,
        createdAt: media.createdAt,
        url: `/api/bathroom-projects/${id}/media/${media.id}`,
      },
      { status: 201 },
    );
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!bathroomPlannerUsable()) {
    return NextResponse.json({ error: "Bathroom planner is not enabled." }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id } = await params;
    await assertBathroomProjectAccess(session, id);
    const { mediaId } = await req.json();
    if (!mediaId || typeof mediaId !== "string") {
      return NextResponse.json({ error: "mediaId required" }, { status: 400 });
    }
    const media = await prisma.bathroomMedia.findUnique({ where: { id: mediaId } });
    if (!media || media.projectId !== id) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }
    await deleteBathroomUpload(media.storagePath);
    await prisma.bathroomMedia.delete({ where: { id: mediaId } });
    return NextResponse.json({ deleted: true });
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Delete failed" }, { status });
  }
}
