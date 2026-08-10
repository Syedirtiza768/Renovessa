/**
 * Contractor-ready Solar Project Brief (§44).
 *
 * This is what makes a Renovessa solar lead worth more than a name and a
 * phone number: an installer receives the roof analysis, the layout, the
 * consumption basis, the electrical context, every assumption behind the
 * numbers, and an explicit list of what still needs site verification.
 *
 * Pure function. Contact details are deliberately NOT part of the brief —
 * they are attached at RFP submission, after consent (§45, §51).
 */

import type {
  RoofAnalysis,
  SolarPlanResult,
  NormalizedTariff,
  ConsumptionResult,
  CandidatePanel,
} from "./types";
import { BRIEF_SCHEMA_VERSION, calculationVersionSnapshot } from "./versions";
import { consumptionBasisLabel } from "./consumption";
import { compassLabel, squareMetersToSquareFeet } from "./geo";
import { describeManualRoof } from "./manual-roof";
import { modelLabel } from "./production";

export interface SolarBriefInput {
  referenceNumber: string;
  address: {
    formatted?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    county?: string | null;
  };
  property: {
    propertyType?: string | null;
    ownershipStatus?: string | null;
    occupancyStatus?: string | null;
    projectGoal?: string | null;
    timelineCategory?: string | null;
  };
  roof: {
    materialAnswer?: string | null;
    ageAnswer?: string | null;
    knownIssues?: string | null;
    reroofPlanned?: boolean;
  };
  electrical: {
    mainPanelRatingAnswer?: string | null;
    panelLocationAnswer?: string | null;
    existingSolar?: boolean;
    serviceUpgradeExpected?: boolean;
    mainPanelUpgradeExpected?: boolean;
  };
  analysis: RoofAnalysis | null;
  selectedPanels: CandidatePanel[];
  plan: SolarPlanResult;
  /** Notes the layout engine emitted (e.g. "your roof can't reach 100% offset"). */
  layoutNotes?: string[];
  consumption: ConsumptionResult;
  tariff: NormalizedTariff | null;
  documents: Array<{ kind: string; fileName: string; caption?: string | null }>;
  buildingConfirmed: boolean;
  generatedAt?: string;
}

export interface SolarProjectBriefDocument {
  schemaVersion: string;
  generatedAt: string;
  referenceNumber: string;
  disclaimer: string;
  project: Record<string, unknown>;
  property: Record<string, unknown>;
  roofAnalysis: Record<string, unknown>;
  solarConfiguration: Record<string, unknown>;
  consumption: Record<string, unknown>;
  utility: Record<string, unknown>;
  electrical: Record<string, unknown>;
  storage: Record<string, unknown>;
  financialPlanning: Record<string, unknown>;
  documentation: Array<Record<string, unknown>>;
  assumptions: string[];
  outstandingVerification: string[];
  methodology: Record<string, unknown>;
}

export const BRIEF_DISCLAIMER =
  "This is a conceptual planning document produced by Renovessa's solar planner from aerial roof data, independent production modelling, and homeowner-supplied information. It is not an engineering design, a structural assessment, a code-compliance determination, or a quote. Panel placement is conceptual: final layout, setbacks, access pathways, structural adequacy, electrical interconnection and pricing must be verified on site by the installer and the local authority having jurisdiction.";

export function buildSolarProjectBrief(input: SolarBriefInput): SolarProjectBriefDocument {
  const { plan, analysis } = input;
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  const production = plan.production;
  const cost = plan.cost;

  return {
    schemaVersion: BRIEF_SCHEMA_VERSION,
    generatedAt,
    referenceNumber: input.referenceNumber,
    disclaimer: BRIEF_DISCLAIMER,

    project: {
      // Service location only — no street address until contact release.
      serviceArea: [input.address.city, input.address.state, input.address.postalCode]
        .filter(Boolean)
        .join(", "),
      county: input.address.county ?? null,
      projectGoal: input.property.projectGoal ?? "Not specified",
      timeline: input.property.timelineCategory ?? "Not specified",
      planningConfidence: plan.confidence.overall,
      confidenceByDimension: plan.confidence.dimensions.map((d) => ({
        dimension: d.label,
        level: d.level,
        reasons: d.reasons,
      })),
    },

    property: {
      buildingType: input.property.propertyType ?? "Not specified",
      ownership: input.property.ownershipStatus ?? "Not specified",
      occupancy: input.property.occupancyStatus ?? "Not specified",
      roofMaterial: input.roof.materialAnswer ?? "Not specified",
      roofAge: input.roof.ageAnswer ?? "Not specified",
      knownRoofIssues: input.roof.knownIssues ?? "None reported",
      reroofPlanned: input.roof.reroofPlanned ?? false,
    },

    roofAnalysis: analysis
      ? {
          dataSource: analysis.isManual ? "Homeowner-described (no aerial coverage)" : `Aerial analysis — ${analysis.providerId}`,
          buildingConfirmedByHomeowner: input.buildingConfirmed,
          imageryDate: analysis.imageryDate ?? "Not reported",
          imageryProcessedDate: analysis.imageryProcessedDate ?? "Not reported",
          imageryQuality: analysis.imageryQuality,
          wholeRoofAreaSqFt: analysis.wholeRoofAreaMeters2
            ? Math.round(squareMetersToSquareFeet(analysis.wholeRoofAreaMeters2))
            : null,
          maxSuitablePanelPositions: analysis.maxPanelCount,
          manualRoofDescription: analysis.isManual ? describeManualRoof(analysis) : null,
          segments: analysis.segments.map((s) => ({
            face: s.index + 1,
            facing: compassLabel(s.azimuthDegrees),
            azimuthDegrees: Math.round(s.azimuthDegrees),
            pitchDegrees: Math.round(s.pitchDegrees),
            areaSqFt: Math.round(squareMetersToSquareFeet(s.areaMeters2)),
            medianAnnualSunshineHours: s.medianSunshineHours ? Math.round(s.medianSunshineHours) : null,
            panelsSelectedOnThisFace: input.selectedPanels.filter((p) => p.segmentIndex === s.index).length,
          })),
        }
      : { dataSource: "No roof analysis was completed", buildingConfirmedByHomeowner: false },

    solarConfiguration: {
      panelCount: plan.system.panelCount.value,
      panelSpecification: analysis
        ? {
            ratedWatts: analysis.panelSpec.capacityWatts,
            widthMeters: analysis.panelSpec.widthMeters,
            heightMeters: analysis.panelSpec.heightMeters,
            source:
              analysis.panelSpec.source === "equipment_catalog"
                ? `${analysis.panelSpec.manufacturer ?? ""} ${analysis.panelSpec.model ?? ""}`.trim()
                : "Conceptual planning module from the roof layout model — installer's actual module will differ",
          }
        : null,
      dcSystemSizeKw: round(plan.system.dcSystemSizeKw.value, 2),
      estimatedFirstYearProductionKwh: production.annualAcKwh ? Math.round(production.annualAcKwh.value) : null,
      productionRangeKwh: production.rangeLowKwh &&
        production.rangeHighKwh && {
          low: Math.round(production.rangeLowKwh.value),
          high: Math.round(production.rangeHighKwh.value),
        },
      monthlyProductionKwh: production.monthlyAcKwh?.value.map((v) => Math.round(v)) ?? null,
      productionModelsUsed: production.models.map((m) => ({
        model: modelLabel(m.modelId),
        annualAcKwh: Math.round(m.annualAcKwh),
        notes: m.notes,
      })),
      productionModelAgreement: production.agreement,
      productionModelDifferencePercent:
        production.differencePercent !== null ? round(production.differencePercent, 1) : null,
      productionModelFailures: production.failures,
      roofUtilisation: {
        panelsUsed: plan.roofUsage.usedPanelCount,
        maxSuitablePositions: plan.roofUsage.maxPanelCount,
        percentOfSuitableRoofUsed: Math.round(plan.roofUsage.percentOfSuitableRoofUsed),
      },
    },

    consumption: {
      annualKwh: input.consumption.annualKwh ? Math.round(input.consumption.annualKwh.value) : null,
      basis: consumptionBasisLabel(input.consumption.basis),
      confidence: input.consumption.annualKwh?.provenance.confidence ?? "LOW",
      estimatedSolarOffsetPercent: plan.offsetPercent ? Math.round(plan.offsetPercent.value) : null,
      assumptions: input.consumption.assumptions,
      unresolvedConflicts: input.consumption.anomalies,
    },

    utility: input.tariff
      ? {
          provider: input.tariff.utilityName,
          ratePlan: input.tariff.tariffName,
          effectiveDate: input.tariff.effectiveDate ?? "Not reported",
          blendedEnergyRateDollarsPerKwh: input.tariff.blendedEnergyRateDollarsPerKwh ?? null,
          fixedMonthlyChargeDollars: input.tariff.fixedMonthlyChargeDollars ?? null,
          structureNote: input.tariff.hasComplexStructure
            ? "This tariff has tiered or time-of-use pricing that was not reduced to a single rate."
            : "Flat rate structure.",
          source: input.tariff.sourceUri ?? input.tariff.providerId,
          retrievedAt: input.tariff.retrievedAt,
          confirmedByHomeowner: input.tariff.homeownerConfirmed,
        }
      : { provider: "Not identified", note: "No rate plan was confirmed for this project." },

    electrical: {
      mainServiceRating: input.electrical.mainPanelRatingAnswer ?? "Not known",
      panelLocation: input.electrical.panelLocationAnswer ?? "Not specified",
      existingSolar: input.electrical.existingSolar ?? false,
      homeownerExpectsServiceUpgrade: input.electrical.serviceUpgradeExpected ?? false,
      homeownerExpectsMainPanelWork: input.electrical.mainPanelUpgradeExpected ?? false,
      note: "All electrical information is homeowner-reported and unverified.",
    },

    storage: {
      requested: false,
      note: "Battery storage was not configured for this project.",
    },

    financialPlanning: cost.displayable
      ? {
          installedCostRange: { low: cost.installedCostLow, high: cost.installedCostHigh },
          dollarsPerWattRange: {
            low: round(cost.dollarsPerWattLow, 2),
            high: round(cost.dollarsPerWattHigh, 2),
          },
          netCostRange:
            cost.netCostLow !== null && cost.netCostHigh !== null
              ? { low: cost.netCostLow, high: cost.netCostHigh }
              : null,
          lineItems: cost.lineItems.map((li) => ({
            category: li.category,
            description: li.description,
            low: li.lowAmount,
            high: li.highAmount,
            basis: li.calculationReference,
            appliedBecause: li.triggerBasis,
          })),
          incentives: cost.appliedIncentives.map((a) => ({
            name: a.program.name,
            jurisdiction: a.program.jurisdiction,
            applicability: a.program.applicability,
            source: a.program.sourceUrl,
            lastVerified: a.program.lastVerifiedAt,
            estimatedAmount: a.estimatedAmount ? Math.round(a.estimatedAmount.value) : null,
            includedInNetCost: a.includedInNetCost,
            excludedBecause: a.reasonExcluded ?? null,
          })),
          exclusions: cost.exclusions,
          pricingConfigVersion: cost.pricingConfigVersion,
          note: "Renovessa planning range only. Not a quote.",
        }
      : {
          note:
            cost.withheldReason ??
            "Cost figures were withheld because no reviewed local pricing model has been published for this market.",
          pricingConfigVersion: cost.pricingConfigVersion,
        },

    documentation: input.documents.map((d) => ({
      kind: d.kind,
      fileName: d.fileName,
      caption: d.caption ?? null,
    })),

    assumptions: dedupe([
      ...production.assumptions,
      ...input.consumption.assumptions,
      ...cost.assumptions,
      ...(input.layoutNotes ?? []),
    ]),

    outstandingVerification: plan.outstandingVerification,

    methodology: {
      calculationVersions: calculationVersionSnapshot(),
      aiUsage:
        "No AI was used to determine roof geometry, sunlight, production, pricing, incentives, or code requirements in this brief.",
      methodologyUrl: "/solar/methodology",
    },
  };
}

function dedupe(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
