import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { assertSolarProjectAccess } from "@/lib/solar/authorization";
import { loadActiveRoofAnalysis, loadActiveTariff } from "@/lib/solar/persistence";
import { resolvePricingConfig } from "@/lib/solar/config-loader";
import { getIncentiveProvider } from "@/lib/solar/providers";
import { buildPlan } from "@/lib/solar/plan";
import { buildSolarProjectBrief } from "@/lib/solar/brief";
import { BRIEF_SCHEMA_VERSION } from "@/lib/solar/versions";
import { deriveConsumption } from "@/lib/solar/consumption";
import { solarBriefEnabled } from "@/lib/feature-flags";
import type {
  IncentiveProgram,
  ConsumptionInput,
  LayoutStrategy,
  ProductionModelOutput,
  ProductionModelId,
} from "@/lib/solar/types";

/**
 * Generate the contractor-ready Solar Project Brief.
 *
 * Rebuilt from the persisted layout + production + cost rows rather than
 * recomputed against live APIs, so the brief matches exactly what the
 * homeowner saw and approved.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!solarBriefEnabled()) {
    return NextResponse.json({ error: "The solar project brief is not enabled." }, { status: 404 });
  }

  const session = await getSession();
  try {
    const { id } = await params;
    const project = await assertSolarProjectAccess(session, id);

    const [analysis, layout, productionRow, profile, tariff, documents] = await Promise.all([
      loadActiveRoofAnalysis(id),
      prisma.solarPanelLayout.findFirst({ where: { projectId: id, isActive: true }, orderBy: { createdAt: "desc" } }),
      prisma.solarProductionEstimate.findFirst({ where: { projectId: id }, orderBy: { createdAt: "desc" } }),
      prisma.solarEnergyProfile.findUnique({ where: { projectId: id } }),
      loadActiveTariff(id),
      prisma.solarDocument.findMany({ where: { projectId: id }, orderBy: { createdAt: "asc" } }),
    ]);

    if (!layout) {
      return NextResponse.json(
        { error: "Build and save a solar plan before generating a project brief." },
        { status: 409 },
      );
    }

    const { config } = await resolvePricingConfig();
    const answers = (project.answersJson as Record<string, string> | null) ?? {};

    const consumptionInput: ConsumptionInput = {
      monthlyKwh: (profile?.monthlyKwhJson as number[] | null) ?? undefined,
      annualKwh: profile?.annualKwh ?? undefined,
      averageMonthlyBillDollars: profile?.averageMonthlyBillDollars ?? undefined,
      blendedRateDollarsPerKwh: profile?.blendedRateDollarsPerKwh ?? undefined,
      fixedMonthlyChargeDollars: profile?.fixedMonthlyChargeDollars ?? undefined,
    };

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

    // Replay the saved production run rather than re-calling the models: the
    // brief must reproduce the approved numbers, not fresh ones.
    const savedModels = (productionRow?.modelsJson as unknown as ProductionModelOutput[] | null) ?? [];
    const pvwatts = savedModels.find((m) => m.modelId === "PVWATTS_V8") ?? null;
    const savedFailures =
      (productionRow?.failuresJson as unknown as Array<{ modelId: ProductionModelId; message: string }> | null) ?? [];

    const plan = buildPlan({
      config,
      analysis,
      buildingConfirmed: project.buildingConfirmed,
      propertyChangedSinceImagery: answers.property_changed_since_imagery === "yes",
      strategy: "MANUAL" as LayoutStrategy,
      explicitPanelIds: layout.selectedPanelIds,
      excludedSegmentIndices: layout.excludedSegmentIndices,
      consumption: consumptionInput,
      pvwattsOutput: pvwatts,
      pvwattsFailure: savedFailures.find((f) => f.modelId === "PVWATTS_V8")?.message ?? null,
      answers: {
        mainPanelUpgradeExpected: answers.main_panel_upgrade === "yes",
        serviceUpgradeExpected: answers.service_upgrade === "yes",
        arrayOnDetachedStructure: answers.detached_structure === "yes",
        reroofPlanned: answers.reroof_planned === "yes",
      },
      electricalInfoComplete: Boolean(answers.main_panel_rating),
      incentives,
      incentiveLookupFailed,
    });

    const selectedIds = new Set(layout.selectedPanelIds);
    const selectedPanels = (analysis?.candidatePanels ?? []).filter((p) => selectedIds.has(p.id));

    const brief = buildSolarProjectBrief({
      referenceNumber: project.referenceNumber,
      address: {
        formatted: project.formattedAddress,
        city: project.city,
        state: project.state,
        postalCode: project.postalCode,
        county: project.county,
      },
      property: {
        propertyType: project.propertyType,
        ownershipStatus: project.ownershipStatus,
        occupancyStatus: project.occupancyStatus,
        projectGoal: project.projectGoal,
        timelineCategory: project.timelineCategory,
      },
      roof: {
        materialAnswer: answers.roof_material ?? null,
        ageAnswer: answers.roof_age ?? null,
        knownIssues: answers.roof_issues ?? null,
        reroofPlanned: answers.reroof_planned === "yes",
      },
      electrical: {
        mainPanelRatingAnswer: answers.main_panel_rating ?? null,
        panelLocationAnswer: answers.main_panel_location ?? null,
        existingSolar: answers.existing_solar === "yes",
        serviceUpgradeExpected: answers.service_upgrade === "yes",
        mainPanelUpgradeExpected: answers.main_panel_upgrade === "yes",
      },
      analysis,
      selectedPanels,
      plan,
      layoutNotes: plan.layoutNotes,
      consumption: deriveConsumption(consumptionInput),
      tariff,
      documents: documents.map((d) => ({ kind: d.kind, fileName: d.fileName, caption: d.caption })),
      buildingConfirmed: project.buildingConfirmed,
    });

    const previous = await prisma.solarProjectBrief.findFirst({
      where: { projectId: id },
      orderBy: { version: "desc" },
    });

    const saved = await prisma.solarProjectBrief.create({
      data: {
        projectId: id,
        version: (previous?.version ?? 0) + 1,
        briefJson: brief as unknown as Prisma.InputJsonValue,
        schemaVersion: BRIEF_SCHEMA_VERSION,
      },
    });

    await prisma.solarProject.update({ where: { id }, data: { status: "BRIEF_READY" } });

    await logAuditEvent({
      eventType: "SOLAR_BRIEF_GENERATED",
      description: `Solar project brief v${saved.version} generated for ${project.referenceNumber}`,
      actorId: session?.id,
      solarProjectId: id,
      metadata: { briefId: saved.id, version: saved.version, schemaVersion: BRIEF_SCHEMA_VERSION },
    });

    return NextResponse.json({ brief, briefId: saved.id, version: saved.version }, { status: 201 });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    console.error("solar brief POST", e);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: err.status || 500 });
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  try {
    const { id } = await params;
    await assertSolarProjectAccess(session, id);
    const brief = await prisma.solarProjectBrief.findFirst({
      where: { projectId: id },
      orderBy: { version: "desc" },
    });
    return NextResponse.json({ brief });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    return NextResponse.json({ error: err.message || "Internal error" }, { status: err.status || 500 });
  }
}
