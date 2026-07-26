import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const config = await prisma.estimatorConfiguration.findUnique({ where: { id } });
  if (!config) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(config);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { action } = await req.json();

  const config = await prisma.estimatorConfiguration.findUnique({ where: { id } });
  if (!config) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "publish") {
    if (config.status !== "DRAFT") {
      return NextResponse.json({ error: `Cannot publish from ${config.status}` }, { status: 400 });
    }
    // Retire any currently published config for the same location/trade.
    await prisma.estimatorConfiguration.updateMany({
      where: { locationId: config.locationId, tradeId: config.tradeId, status: "PUBLISHED" },
      data: { status: "RETIRED" as any, validTo: new Date() },
    });
    const updated = await prisma.estimatorConfiguration.update({
      where: { id },
      data: { status: "PUBLISHED", publishedAt: new Date(), approvedBy: session.id },
    });
    await logAuditEvent({
      eventType: "STATUS_CHANGED",
      description: `Estimator configuration ${config.version} published`,
      actorId: session.id,
      metadata: { configId: id, version: config.version },
    });
    return NextResponse.json(updated);
  }

  if (action === "retire") {
    const updated = await prisma.estimatorConfiguration.update({
      where: { id },
      data: { status: "RETIRED" as any, validTo: new Date() },
    });
    await logAuditEvent({
      eventType: "STATUS_CHANGED",
      description: `Estimator configuration ${config.version} retired`,
      actorId: session.id,
      metadata: { configId: id, version: config.version },
    });
    return NextResponse.json(updated);
  }

  if (action === "clone") {
    const cloned = await prisma.estimatorConfiguration.create({
      data: {
        name: `${config.name} (clone)`,
        version: `${config.version}-clone-${Date.now()}`,
        locationId: config.locationId,
        tradeId: config.tradeId,
        validFrom: new Date(),
        status: "DRAFT",
        configurationJson: config.configurationJson as any,
        methodology: config.methodology,
        createdBy: session.id,
      },
    });
    await logAuditEvent({
      eventType: "STATUS_CHANGED",
      description: `Estimator configuration ${config.version} cloned to ${cloned.version}`,
      actorId: session.id,
      metadata: { sourceId: id, clonedId: cloned.id },
    });
    return NextResponse.json(cloned, { status: 201 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
