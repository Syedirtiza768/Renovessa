import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { assertSolarProjectAccess } from "@/lib/solar/authorization";
import { consumptionInputSchema } from "@/lib/solar/schemas";
import { deriveConsumption } from "@/lib/solar/consumption";
import { checkSolarRateLimit } from "@/lib/solar/rate-limit";

/**
 * Save the household energy profile.
 *
 * The derived result is computed here and returned so the planner can show the
 * basis and any anomalies immediately — including the case where the answer is
 * "we can't estimate your usage from this", which is a legitimate outcome.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = checkSolarRateLimit(req, "project");
  if (limited) return limited;

  const session = await getSession();
  try {
    const { id } = await params;
    await assertSolarProjectAccess(session, id);
    const input = consumptionInputSchema.parse(await req.json());

    const result = deriveConsumption(input);

    const data = {
      basis: result.basis,
      annualKwh: result.annualKwh?.value ?? null,
      monthlyKwhJson: (input.monthlyKwh ?? null) as Prisma.InputJsonValue,
      averageMonthlyBillDollars: input.averageMonthlyBillDollars ?? null,
      blendedRateDollarsPerKwh: input.blendedRateDollarsPerKwh ?? null,
      fixedMonthlyChargeDollars: input.fixedMonthlyChargeDollars ?? null,
      assumptionsJson: result.assumptions as unknown as Prisma.InputJsonValue,
      anomaliesJson: result.anomalies as unknown as Prisma.InputJsonValue,
      calculationVersion: result.calculationVersion,
    };

    const profile = await prisma.solarEnergyProfile.upsert({
      where: { projectId: id },
      create: { projectId: id, ...data },
      update: data,
    });

    await logAuditEvent({
      eventType: "SOLAR_USAGE_PROVIDED",
      description: `Electricity usage provided (${result.basis})`,
      actorId: session?.id,
      solarProjectId: id,
      // Basis and confidence only — never the raw usage figures in analytics.
      metadata: { basis: result.basis, hasAnomalies: result.anomalies.length > 0 },
    });

    return NextResponse.json({ profile, consumption: result });
  } catch (e: unknown) {
    const err = e as { name?: string; status?: number; message?: string; errors?: Array<{ message: string }> };
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    console.error("solar energy PUT", e);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: err.status || 500 });
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  try {
    const { id } = await params;
    await assertSolarProjectAccess(session, id);
    const profile = await prisma.solarEnergyProfile.findUnique({ where: { projectId: id } });
    return NextResponse.json({ profile });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    return NextResponse.json({ error: err.message || "Internal error" }, { status: err.status || 500 });
  }
}
