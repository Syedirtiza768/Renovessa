import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { bathroomContractorStudioEnabled, bathroomEstimatorEnabled } from "@/lib/feature-flags";
import { assertContractorOwnsBathroomProject } from "@/lib/bathroom/authorization";
import { DEFAULT_ESTIMATOR_CONFIG } from "@/lib/bathroom/config";
import { generateEstimate, type EstimateInputs } from "@/lib/bathroom/estimator";
import { scoreConfidence, type ConfidenceInput } from "@/lib/bathroom/confidence";
import {
  normalizeStudioPricing,
  seedContractorLineItems,
  recalculatePricing,
} from "@/lib/bathroom/contractor-pricing";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!bathroomContractorStudioEnabled() || !bathroomEstimatorEnabled()) {
    return NextResponse.json({ error: "Estimator not available." }, { status: 404 });
  }
  const session = await getSession();
  try {
    const { id } = await params;
    const { project, profile } = await assertContractorOwnsBathroomProject(session, id);
    const body = await req.json().catch(() => ({}));
    const a = {
      ...((project.answersJson as Record<string, string>) || {}),
      ...(body.answers || {}),
    };

    const length = Number(a.length || a.lengthFt) || 8;
    const width = Number(a.width || a.widthFt) || 5;
    const floorArea = length * width;
    const homeAgeYears = a.homeAge ? Math.max(0, new Date().getFullYear() - Number(a.homeAge)) : 30;
    const conditions = (a.conditions ?? "").split(",").filter(Boolean);
    const accessibility = (a.accessibilityFeatures ?? "").split(",").filter(Boolean);
    const waterDamageReported = conditions.some((c: string) =>
      ["active_leak", "water_stains", "soft_flooring", "past_leak"].includes(c),
    );

    const confidenceInput: ConfidenceInput = {
      hasExactMeasurements: Boolean(a.length && a.width),
      hasCompleteDiagram: a.has_diagram === "yes",
      hasMultiplePhotos: Number(a.photo_count || 0) >= 2,
      finishTierSelected: Boolean(a.fixtureTier),
      plumbingChangesKnown: Boolean(a.permit_fixtures_moving),
      conditionQuestionnaireComplete: conditions.length > 0,
      unknownLayout: false,
      possibleHiddenDamage: waterDamageReported,
      majorStructuralOrPlumbingUncertainty: false,
    };
    const confidence = scoreConfidence(confidenceInput);

    const inputs: EstimateInputs = {
      objective: project.projectObjective || a.projectObjective || "remodel_same_layout",
      bathroomType: project.bathroomType || a.bathroomType || "guest",
      finishTier: a.fixtureTier || "standard",
      floorAreaSqft: floorArea,
      plumbingRelocationFt: a.permit_fixtures_moving === "Yes" ? 6 : 0,
      electricalModifications: a.permit_lighting_added_relocated === "Yes" ? 2 : 1,
      tileFullHeightRoom: a.wallFinish === "full_height_room_tile",
      curblessShower: a.showerTub === "curbless_shower" || accessibility.includes("curbless_shower"),
      condoHighFloor: ["condo", "coop", "apartment"].includes(a.propertyType || ""),
      homeAgeYears,
      waterDamageReported,
      inRockville: true,
    };

    const estimate = generateEstimate(inputs, DEFAULT_ESTIMATOR_CONFIG, confidence);
    const settings = normalizeStudioPricing(profile.studioPricingJson);
    const seeded = seedContractorLineItems(estimate.lineItems, settings);
    const priced = recalculatePricing(seeded, settings);

    const config = await prisma.estimatorConfiguration.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: { validFrom: "desc" },
    });

    let saved = null;
    if (config) {
      saved = await prisma.bathroomEstimate.create({
        data: {
          projectId: id,
          configurationId: config.id,
          lowAmount: estimate.lowAmount,
          expectedLowAmount: estimate.expectedLowAmount,
          expectedHighAmount: estimate.expectedHighAmount,
          highComplexityAmount: estimate.highComplexityAmount,
          contingencyAmount: estimate.contingencyAmount,
          confidenceLevel: confidence.level,
          assumptionsJson: estimate.assumptions,
          unknownsJson: estimate.unknowns,
          exclusionsJson: estimate.exclusions,
          costDriversJson: estimate.costDrivers,
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
    }

    await logAuditEvent({
      eventType: "BATHROOM_ESTIMATE_GENERATED",
      description: `Contractor studio estimate for ${project.referenceNumber}`,
      actorId: session?.id,
      bathroomProjectId: id,
      metadata: {
        mid: estimate.expectedLowAmount,
        confidence: confidence.level,
        contractorCustomerTotal: priced.totals.customerTotal,
      },
    });

    return NextResponse.json({
      low: estimate.lowAmount,
      mid: estimate.expectedLowAmount,
      high: estimate.highComplexityAmount,
      confidence: {
        level: confidence.level,
        reasons: confidence.reasons,
        suggestions: confidence.improvements,
      },
      baselineLineItems: estimate.lineItems.map((li) => ({
        category: li.category,
        description: li.description,
        low: li.lowAmount,
        mid: Math.round((li.lowAmount + li.highAmount) / 2),
        high: li.highAmount,
      })),
      pricedLineItems: priced.lineItems,
      totals: priced.totals,
      pricingSettings: settings,
      savedId: saved?.id ?? null,
      note: "Baseline planning range priced with your markup. Edit line items, then approve before downloading the client PDF.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: e?.status || 500 });
  }
}
