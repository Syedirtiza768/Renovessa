import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isAdminRole } from "@/lib/solar/authorization";
import { DEFAULT_SOLAR_PRICING_CONFIG } from "@/lib/solar/pricing-config";
import { z } from "zod";

/**
 * Admin CRUD for solar pricing/model configurations (§47).
 *
 * Market assumptions must be changeable without a deploy, and every change
 * must be versioned so historical estimates stay reproducible. A published
 * configuration is therefore never edited in place — publishing supersedes.
 */

const createSchema = z.object({
  name: z.string().trim().min(3).max(120),
  version: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens"),
  market: z.string().trim().min(2).max(120),
  dataBasis: z.enum(["unvalidated_planning_default", "renovessa_market_data", "reviewed_external_benchmark"]),
  sampleCount: z.number().int().min(0).max(100_000),
  mostRecentSampleDate: z.string().datetime().optional(),
  validFrom: z.string().datetime(),
  validTo: z.string().datetime().optional(),
  configurationJson: z.record(z.string(), z.unknown()),
  methodology: z.string().max(8000).optional(),
});

async function requireAdmin() {
  const session = await getSession();
  if (!session || !isAdminRole(session.role)) return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const configurations = await prisma.solarEstimatorConfiguration.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 50,
  });

  return NextResponse.json({
    configurations,
    builtInDefault: DEFAULT_SOLAR_PRICING_CONFIG,
    approvedForDisplay: process.env.NEXT_PUBLIC_APPROVED_SOLAR_PRICING_VERSION ?? null,
    note:
      "Public dollar display is fail-closed: a configuration is only shown to homeowners when NEXT_PUBLIC_APPROVED_SOLAR_PRICING_VERSION matches its version exactly.",
  });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = createSchema.parse(await req.json());

    const created = await prisma.solarEstimatorConfiguration.create({
      data: {
        name: body.name,
        version: body.version,
        market: body.market,
        dataBasis: body.dataBasis,
        sampleCount: body.sampleCount,
        mostRecentSampleDate: body.mostRecentSampleDate ? new Date(body.mostRecentSampleDate) : null,
        validFrom: new Date(body.validFrom),
        validTo: body.validTo ? new Date(body.validTo) : null,
        configurationJson: body.configurationJson as object,
        methodology: body.methodology ?? null,
        createdBy: session.id,
        status: "DRAFT",
      },
    });

    return NextResponse.json({ configuration: created }, { status: 201 });
  } catch (e: unknown) {
    const err = e as { name?: string; code?: string; errors?: Array<{ message: string }> };
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    if (err.code === "P2002") {
      return NextResponse.json({ error: "That version already exists. Versions are immutable." }, { status: 409 });
    }
    console.error("solar pricing-config POST", e);
    return NextResponse.json({ error: "Failed to create configuration" }, { status: 500 });
  }
}

const publishSchema = z.object({
  id: z.string().cuid(),
  action: z.enum(["PUBLISH", "RETIRE"]),
});

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, action } = publishSchema.parse(await req.json());

    if (action === "RETIRE") {
      const retired = await prisma.solarEstimatorConfiguration.update({
        where: { id },
        data: { status: "RETIRED", validTo: new Date() },
      });
      return NextResponse.json({ configuration: retired });
    }

    // Publishing retires whatever was live, so exactly one configuration is
    // current — and the superseded one stays on record for reproducibility.
    const published = await prisma.$transaction(async (tx) => {
      await tx.solarEstimatorConfiguration.updateMany({
        where: { status: "PUBLISHED", NOT: { id } },
        data: { status: "RETIRED", validTo: new Date() },
      });
      return tx.solarEstimatorConfiguration.update({
        where: { id },
        data: { status: "PUBLISHED", publishedAt: new Date(), approvedBy: session.id },
      });
    });

    return NextResponse.json({
      configuration: published,
      reminder:
        published.version === process.env.NEXT_PUBLIC_APPROVED_SOLAR_PRICING_VERSION
          ? null
          : `Homeowners still won't see dollar figures until NEXT_PUBLIC_APPROVED_SOLAR_PRICING_VERSION is set to "${published.version}" and the app is redeployed.`,
    });
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: Array<{ message: string }> };
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    console.error("solar pricing-config PATCH", e);
    return NextResponse.json({ error: "Failed to update configuration" }, { status: 500 });
  }
}
