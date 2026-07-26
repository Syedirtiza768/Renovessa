import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { estimateInputsSchema } from "@/lib/bathroom/schemas";
import { assertBathroomProjectAccess } from "@/lib/bathroom/authorization";
import { generateEstimate } from "@/lib/bathroom/estimator";
import { generateBudgetScenarios } from "@/lib/bathroom/budget-scenarios";
import { scoreConfidence, deriveConfidenceInput } from "@/lib/bathroom/confidence";
import { DEFAULT_ESTIMATOR_CONFIG } from "@/lib/bathroom/config";
import { bathroomPlannerUsable, BATHROOM_DEMO_MODE } from "@/lib/feature-flags";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!bathroomPlannerUsable()) {
    return NextResponse.json({ error: "Bathroom estimator is not enabled." }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id } = await params;
    const project = await assertBathroomProjectAccess(session, id);
    const inputs = estimateInputsSchema.parse(await req.json());

    // Resolve the active published EstimatorConfiguration, falling back to the
    // built-in default when none is published (and demo mode is on).
    let config: any = DEFAULT_ESTIMATOR_CONFIG;
    let configurationId: string | null = null;
    const published = await prisma.estimatorConfiguration.findFirst({
      where: { status: "PUBLISHED", locationId: "rockville-md", tradeId: "bathroom" },
      orderBy: { publishedAt: "desc" },
    });
    if (published) {
      const merged = { ...DEFAULT_ESTIMATOR_CONFIG, ...(published.configurationJson as Record<string, unknown>), version: published.version };
      config = merged;
      configurationId = published.id;
    } else if (!BATHROOM_DEMO_MODE) {
      // Fail closed: no approved configuration means no public numeric estimate.
      return NextResponse.json(
        { error: "No approved estimator configuration is published for this location. Numeric estimates are withheld until review." },
        { status: 409 },
      );
    }

    const confidence = scoreConfidence(deriveConfidenceInput({
      measurement_method: inputs.objective, // placeholder; real flow passes answers
      has_diagram: "yes",
      finish_tier: inputs.finishTier,
      plumbing_relocation: inputs.plumbingRelocationFt > 0 ? "known" : "none",
      condition_questionnaire: "complete",
      layout_known: "yes",
      photo_count: "3",
    } as any));

    const estimate = generateEstimate(inputs, config, confidence);

    const saved = await prisma.bathroomEstimate.create({
      data: {
        projectId: id,
        configurationId: configurationId ?? "default-internal",
        lowAmount: estimate.lowAmount,
        expectedLowAmount: estimate.expectedLowAmount,
        expectedHighAmount: estimate.expectedHighAmount,
        highComplexityAmount: estimate.highComplexityAmount,
        contingencyAmount: estimate.contingencyAmount,
        confidenceLevel: estimate.confidenceLevel as any,
        assumptionsJson: estimate.assumptions as any,
        unknownsJson: estimate.unknowns as any,
        exclusionsJson: estimate.exclusions as any,
        costDriversJson: estimate.costDrivers as any,
        inputSnapshotJson: inputs as any,
        lineItems: {
          create: estimate.lineItems.map((li) => ({
            category: li.category,
            description: li.description,
            quantity: li.quantity,
            unit: li.unit,
            unitRate: li.unitRate,
            lowAmount: li.lowAmount,
            highAmount: li.highAmount,
            multiplier: li.multiplier,
            calculationReference: li.calculationReference,
            sortOrder: li.sortOrder,
          })),
        },
      },
      include: { lineItems: true },
    });

    const scenarios = generateBudgetScenarios(inputs, config, confidence);

    if (session?.role === "HOMEOWNER") {
      await logAuditEvent({
        eventType: "BATHROOM_ESTIMATE_GENERATED",
        description: `Estimate generated for ${project.referenceNumber}: $${estimate.lowAmount}–$${estimate.highComplexityAmount} (${estimate.confidenceLevel})`,
        actorId: session.id,
        bathroomProjectId: id,
        metadata: { estimateId: saved.id, configVersion: estimate.configVersion, confidence: estimate.confidenceLevel },
      });
    }

    return NextResponse.json({ estimate: saved, scenarios, configVersion: estimate.configVersion }, { status: 201 });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json({ error: e.errors?.[0]?.message ?? "Invalid inputs" }, { status: 400 });
    }
    console.error("bathroom-estimates POST", e);
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Internal error" }, { status });
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!bathroomPlannerUsable()) {
    return NextResponse.json({ error: "Bathroom estimator is not enabled." }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id } = await params;
    await assertBathroomProjectAccess(session, id);
    const estimates = await prisma.bathroomEstimate.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { lineItems: true },
    });
    return NextResponse.json(estimates);
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || "Internal error" }, { status });
  }
}
