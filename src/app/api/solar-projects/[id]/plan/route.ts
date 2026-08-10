import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { assertSolarProjectAccess } from "@/lib/solar/authorization";
import { planRequestSchema } from "@/lib/solar/schemas";
import { loadActiveRoofAnalysis } from "@/lib/solar/persistence";
import { resolvePricingConfig } from "@/lib/solar/config-loader";
import { getProductionModelProvider, getIncentiveProvider } from "@/lib/solar/providers";
import { selectPanels, buildSegmentProductionInputs } from "@/lib/solar/layout-engine";
import { buildPlan } from "@/lib/solar/plan";
import { calculationVersionSnapshot } from "@/lib/solar/versions";
import { checkSolarRateLimit } from "@/lib/solar/rate-limit";
import { solarPlannerUsable } from "@/lib/feature-flags";
import type { IncentiveProgram, ProductionModelOutput, ConsumptionInput } from "@/lib/solar/types";

/**
 * Compute a full solar plan: layout → system size → production (both models)
 * → consumption → cost → confidence.
 *
 * `persist: false` is the live-preview path used while the homeowner drags the
 * panel slider; it recomputes without writing. `persist: true` snapshots the
 * layout, production run and cost estimate with their calculation versions so
 * the result stays reproducible later (§48).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!solarPlannerUsable()) {
    return NextResponse.json({ error: "The solar planner is not enabled." }, { status: 404 });
  }
  const limited = checkSolarRateLimit(req, "plan");
  if (limited) return limited;

  const session = await getSession();
  try {
    const { id } = await params;
    const project = await assertSolarProjectAccess(session, id);
    const body = planRequestSchema.parse(await req.json());

    const analysis = await loadActiveRoofAnalysis(id);
    const { config, configurationId } = await resolvePricingConfig();

    // --- Consumption: request body wins, otherwise the saved profile --------
    const savedProfile = await prisma.solarEnergyProfile.findUnique({ where: { projectId: id } });
    const consumptionInput: ConsumptionInput = body.consumption ?? {
      monthlyKwh: (savedProfile?.monthlyKwhJson as number[] | null) ?? undefined,
      annualKwh: savedProfile?.annualKwh ?? undefined,
      averageMonthlyBillDollars: savedProfile?.averageMonthlyBillDollars ?? undefined,
      blendedRateDollarsPerKwh: savedProfile?.blendedRateDollarsPerKwh ?? undefined,
      fixedMonthlyChargeDollars: savedProfile?.fixedMonthlyChargeDollars ?? undefined,
    };

    // --- Independent production model (Model B) ----------------------------
    // The layout is resolved once here so PVWatts is called with the exact
    // panel distribution the plan will use.
    let pvwattsOutput: ProductionModelOutput | null = null;
    let pvwattsFailure: string | null = null;

    if (analysis) {
      const preview = selectPanels({
        analysis,
        strategy: body.strategy,
        excludedSegmentIndices: body.excludedSegmentIndices,
        panelCount: body.panelCount,
        targetOffsetFraction: body.targetOffsetFraction,
        annualConsumptionKwh: consumptionInput.annualKwh,
        explicitPanelIds: body.explicitPanelIds,
        dcToAcDerate: config.production.dcToAcDerate,
      });

      const segments = buildSegmentProductionInputs(
        analysis,
        preview.selectedPanels,
        config.production.minModelledTiltDegrees,
      );

      const provider = getProductionModelProvider();
      if (!provider) {
        pvwattsFailure = "The independent production model is not enabled for this environment.";
      } else if (segments.length === 0) {
        pvwattsFailure = "No panels are selected, so there was nothing to model independently.";
      } else {
        const result = await provider.modelProduction(segments, {
          systemLossesPercent: config.production.systemLossesPercent,
        });
        if (result.ok) {
          pvwattsOutput = result.output;
        } else {
          pvwattsFailure = result.message;
          await logAuditEvent({
            eventType: "SOLAR_PROVIDER_FAILURE",
            description: `PVWatts modelling failed: ${result.message}`,
            actorId: session?.id,
            solarProjectId: id,
            metadata: { provider: "pvwatts-v8" },
          });
        }
      }
    }

    // --- Incentives: verified programs only, empty is a valid answer -------
    let incentives: IncentiveProgram[] = [];
    let incentiveLookupFailed = false;
    const incentiveProvider = getIncentiveProvider();
    if (incentiveProvider) {
      const result = await incentiveProvider.findIncentives({
        state: project.state ?? undefined,
        county: project.county ?? undefined,
        postalCode: project.postalCode ?? undefined,
      });
      if (result.ok) incentives = result.programs;
      else incentiveLookupFailed = true;
    }

    // --- Compose ----------------------------------------------------------
    const plan = buildPlan({
      config,
      analysis,
      buildingConfirmed: project.buildingConfirmed,
      propertyChangedSinceImagery:
        (project.answersJson as Record<string, string> | null)?.property_changed_since_imagery === "yes",
      strategy: body.strategy,
      panelCount: body.panelCount,
      targetOffsetFraction: body.targetOffsetFraction,
      excludedSegmentIndices: body.excludedSegmentIndices,
      explicitPanelIds: body.explicitPanelIds,
      consumption: consumptionInput,
      pvwattsOutput,
      pvwattsFailure,
      answers: body.answers ?? {},
      electricalInfoComplete: body.electricalInfoComplete ?? false,
      incentives,
      incentiveLookupFailed,
    });

    // A material model disagreement is logged for review, not just displayed.
    if (plan.production.agreement === "INVESTIGATE") {
      await logAuditEvent({
        eventType: "SOLAR_PRODUCTION_MODEL_DISCREPANCY",
        description: `Production models differ by ${plan.production.differencePercent?.toFixed(1)}%`,
        actorId: session?.id,
        solarProjectId: id,
        metadata: {
          differencePercent: plan.production.differencePercent,
          models: plan.production.models.map((m) => ({ model: m.modelId, annualAcKwh: m.annualAcKwh })),
        },
      });
    }

    if (!body.persist) {
      return NextResponse.json({ plan, persisted: false, configurationId });
    }

    // --- Persist a reproducible snapshot ----------------------------------
    const versions = calculationVersionSnapshot();

    const saved = await prisma.$transaction(async (tx) => {
      await tx.solarPanelLayout.updateMany({ where: { projectId: id, isActive: true }, data: { isActive: false } });

      const layout = await tx.solarPanelLayout.create({
        data: {
          projectId: id,
          strategy: body.strategy,
          selectedPanelIds: plan.selectedPanelIds,
          excludedSegmentIndices: body.excludedSegmentIndices ?? [],
          targetOffsetFraction: body.targetOffsetFraction ?? null,
          panelCount: plan.system.panelCount.value,
          panelCapacityWatts: plan.system.panelCapacityWatts.value,
          dcSystemSizeKw: plan.system.dcSystemSizeKw.value,
          calculationVersion: versions.layout,
        },
      });

      const production = await tx.solarProductionEstimate.create({
        data: {
          projectId: id,
          layoutId: layout.id,
          annualAcKwh: plan.production.annualAcKwh?.value ?? null,
          rangeLowKwh: plan.production.rangeLowKwh?.value ?? null,
          rangeHighKwh: plan.production.rangeHighKwh?.value ?? null,
          monthlyAcKwhJson: (plan.production.monthlyAcKwh?.value ?? null) as Prisma.InputJsonValue,
          agreement: plan.production.agreement,
          differencePercent: plan.production.differencePercent,
          modelsJson: plan.production.models as unknown as Prisma.InputJsonValue,
          failuresJson: plan.production.failures as unknown as Prisma.InputJsonValue,
          assumptionsJson: plan.production.assumptions as unknown as Prisma.InputJsonValue,
          calculationVersion: versions.production,
        },
      });

      const cost = await tx.solarCostEstimate.create({
        data: {
          projectId: id,
          layoutId: layout.id,
          configurationId,
          installedCostLow: plan.cost.installedCostLow,
          installedCostHigh: plan.cost.installedCostHigh,
          netCostLow: plan.cost.netCostLow,
          netCostHigh: plan.cost.netCostHigh,
          dollarsPerWattLow: plan.cost.dollarsPerWattLow,
          dollarsPerWattHigh: plan.cost.dollarsPerWattHigh,
          displayable: plan.cost.displayable,
          withheldReason: plan.cost.withheldReason ?? null,
          confidenceLevel: plan.confidence.overall,
          lineItemsJson: plan.cost.lineItems as unknown as Prisma.InputJsonValue,
          appliedIncentivesJson: plan.cost.appliedIncentives as unknown as Prisma.InputJsonValue,
          assumptionsJson: plan.cost.assumptions as unknown as Prisma.InputJsonValue,
          exclusionsJson: plan.cost.exclusions as unknown as Prisma.InputJsonValue,
          costDriversJson: plan.cost.costDrivers as unknown as Prisma.InputJsonValue,
          confidenceJson: plan.confidence as unknown as Prisma.InputJsonValue,
          // The immutable input snapshot: this plus the versions is what makes
          // a historical estimate explainable after the rules change.
          inputSnapshotJson: {
            request: body,
            consumption: consumptionInput,
            roofAnalysisRetrievedAt: analysis?.retrievedAt ?? null,
            roofAnalysisSource: analysis?.providerId ?? null,
            incentiveProgramIds: incentives.map((i) => i.id),
          } as unknown as Prisma.InputJsonValue,
          pricingConfigVersion: plan.cost.pricingConfigVersion,
          calculationVersionsJson: versions as unknown as Prisma.InputJsonValue,
        },
      });

      await tx.solarProject.update({ where: { id }, data: { status: "PLAN_READY" } });
      return { layoutId: layout.id, productionId: production.id, costId: cost.id };
    });

    await logAuditEvent({
      eventType: "SOLAR_ESTIMATE_GENERATED",
      description: `Solar plan saved for ${project.referenceNumber}: ${plan.system.dcSystemSizeKw.value.toFixed(1)} kW, ${plan.confidence.overall} confidence`,
      actorId: session?.id,
      solarProjectId: id,
      metadata: {
        ...saved,
        panelCount: plan.system.panelCount.value,
        agreement: plan.production.agreement,
        costDisplayable: plan.cost.displayable,
      },
    });

    return NextResponse.json({ plan, persisted: true, ...saved, configurationId }, { status: 201 });
  } catch (e: unknown) {
    const err = e as { name?: string; status?: number; message?: string; errors?: Array<{ message: string }> };
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    console.error("solar plan POST", e);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: err.status || 500 });
  }
}
