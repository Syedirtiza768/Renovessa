import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, canAccessAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { estimatorConfigSchema } from "@/lib/bathroom/schemas";
import { DEFAULT_ESTIMATOR_CONFIG } from "@/lib/bathroom/config";

export async function GET() {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const configs = await prisma.estimatorConfiguration.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(configs);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const data = estimatorConfigSchema.parse(await req.json());
    const created = await prisma.estimatorConfiguration.create({
      data: {
        name: data.name,
        version: data.version,
        locationId: data.locationId ?? "rockville-md",
        tradeId: data.tradeId ?? "bathroom",
        validFrom: new Date(data.validFrom),
        validTo: data.validTo ? new Date(data.validTo) : null,
        status: "DRAFT",
        configurationJson: data.configurationJson as any,
        methodology: data.methodology ?? null,
        createdBy: session.id,
      },
    });
    await logAuditEvent({
      eventType: "STATUS_CHANGED",
      description: `Estimator configuration ${created.version} created as DRAFT`,
      actorId: session.id,
      metadata: { configId: created.id, version: created.version },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json({ error: e.errors?.[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: e?.message || "Failed to create configuration" }, { status: 500 });
  }
}

/** Convenience: seed the default internal baseline configuration. */
export async function PUT() {
  const session = await getSession();
  if (!session || !canAccessAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const existing = await prisma.estimatorConfiguration.findUnique({
    where: { version: DEFAULT_ESTIMATOR_CONFIG.version },
  });
  if (existing) {
    return NextResponse.json({ id: existing.id, version: existing.version, alreadyExists: true });
  }
  const created = await prisma.estimatorConfiguration.create({
    data: {
      name: "Bathroom Rockville internal baseline",
      version: DEFAULT_ESTIMATOR_CONFIG.version,
      locationId: "rockville-md",
      tradeId: "bathroom",
      validFrom: new Date(DEFAULT_ESTIMATOR_CONFIG.validFrom),
      status: "DRAFT",
      configurationJson: DEFAULT_ESTIMATOR_CONFIG as any,
      methodology: DEFAULT_ESTIMATOR_CONFIG.methodology,
      createdBy: session.id,
    },
  });
  await logAuditEvent({
    eventType: "STATUS_CHANGED",
    description: `Default estimator configuration seeded: ${created.version}`,
    actorId: session.id,
    metadata: { configId: created.id },
  });
  return NextResponse.json(created, { status: 201 });
}
