/**
 * Persistence helpers: mapping between DB rows and domain types.
 *
 * Kept out of the route handlers so the JSON-column round-tripping is written
 * once and tested once, and so the retention rules around licensed provider
 * payloads live in a single place (§49, §52).
 */

import { prisma } from "@/lib/db";
// Prisma is needed as a value here (Prisma.DbNull), not only as a type.
import { Prisma } from "@prisma/client";
import type { RoofAnalysis, RoofSegment, CandidatePanel, PanelSpecification, NormalizedTariff } from "./types";

/**
 * How long a licensed provider payload may be cached. Renovessa-derived
 * normalized geometry is retained; the raw payload is purged on this clock.
 */
export const PROVIDER_CACHE_DAYS = Number(process.env.SOLAR_PROVIDER_CACHE_DAYS || 30);

export function providerDataExpiry(from = new Date()): Date {
  return new Date(from.getTime() + PROVIDER_CACHE_DAYS * 86_400_000);
}

type RoofAnalysisRow = Prisma.SolarRoofAnalysisGetPayload<object>;

/** Persist a roof analysis, deactivating any previous one for the project. */
export async function saveRoofAnalysis(
  projectId: string,
  analysis: RoofAnalysis,
  rawPayload: unknown | null,
): Promise<RoofAnalysisRow> {
  return prisma.$transaction(async (tx) => {
    await tx.solarRoofAnalysis.updateMany({
      where: { projectId, isActive: true },
      data: { isActive: false },
    });
    return tx.solarRoofAnalysis.create({
      data: {
        projectId,
        source: analysis.isManual ? "MANUAL" : "PROVIDER",
        providerId: analysis.providerId,
        isActive: true,
        buildingLatitude: analysis.buildingCenter.latitude,
        buildingLongitude: analysis.buildingCenter.longitude,
        imageryDate: analysis.imageryDate ?? null,
        imageryProcessedDate: analysis.imageryProcessedDate ?? null,
        imageryQuality: analysis.imageryQuality,
        segmentsJson: analysis.segments as unknown as Prisma.InputJsonValue,
        candidatePanelsJson: analysis.candidatePanels as unknown as Prisma.InputJsonValue,
        panelSpecJson: analysis.panelSpec as unknown as Prisma.InputJsonValue,
        maxPanelCount: analysis.maxPanelCount,
        maxArrayAreaMeters2: analysis.maxArrayAreaMeters2 ?? null,
        wholeRoofAreaMeters2: analysis.wholeRoofAreaMeters2 ?? null,
        maxSunshineHoursPerYear: analysis.maxSunshineHoursPerYear ?? null,
        carbonOffsetFactorKgPerMwh: analysis.carbonOffsetFactorKgPerMwh ?? null,
        // Licensed source data, on its own retention clock.
        rawProviderPayload: (rawPayload as Prisma.InputJsonValue) ?? Prisma.DbNull,
        providerDataExpiresAt: rawPayload ? providerDataExpiry() : null,
        retrievedAt: new Date(analysis.retrievedAt),
      },
    });
  });
}

/** Rehydrate the active analysis for a project. */
export async function loadActiveRoofAnalysis(projectId: string): Promise<RoofAnalysis | null> {
  const row = await prisma.solarRoofAnalysis.findFirst({
    where: { projectId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return row ? rowToRoofAnalysis(row) : null;
}

export function rowToRoofAnalysis(row: RoofAnalysisRow): RoofAnalysis {
  return {
    providerId: row.providerId,
    isManual: row.source === "MANUAL",
    buildingCenter: { latitude: row.buildingLatitude, longitude: row.buildingLongitude },
    imageryDate: row.imageryDate ?? undefined,
    imageryProcessedDate: row.imageryProcessedDate ?? undefined,
    imageryQuality: (row.imageryQuality as RoofAnalysis["imageryQuality"]) ?? "UNKNOWN",
    segments: (row.segmentsJson as unknown as RoofSegment[]) ?? [],
    candidatePanels: (row.candidatePanelsJson as unknown as CandidatePanel[]) ?? [],
    panelSpec: row.panelSpecJson as unknown as PanelSpecification,
    maxPanelCount: row.maxPanelCount,
    maxArrayAreaMeters2: row.maxArrayAreaMeters2 ?? undefined,
    wholeRoofAreaMeters2: row.wholeRoofAreaMeters2 ?? undefined,
    maxSunshineHoursPerYear: row.maxSunshineHoursPerYear ?? undefined,
    carbonOffsetFactorKgPerMwh: row.carbonOffsetFactorKgPerMwh ?? undefined,
    retrievedAt: row.retrievedAt.toISOString(),
  };
}

/** The homeowner-confirmed tariff for a project, if there is one. */
export async function loadActiveTariff(projectId: string): Promise<NormalizedTariff | null> {
  const row = await prisma.solarTariffSnapshot.findFirst({
    where: { projectId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return null;
  return {
    providerId: row.providerId,
    tariffId: row.tariffId,
    utilityName: row.utilityName,
    tariffName: row.tariffName,
    sector: "Residential",
    effectiveDate: row.effectiveDate ?? undefined,
    blendedEnergyRateDollarsPerKwh: row.blendedEnergyRateDollarsPerKwh ?? undefined,
    fixedMonthlyChargeDollars: row.fixedMonthlyChargeDollars ?? undefined,
    hasComplexStructure: row.hasComplexStructure,
    sourceUri: row.sourceUri ?? undefined,
    retrievedAt: row.retrievedAt.toISOString(),
    homeownerConfirmed: row.homeownerConfirmed,
  };
}

/**
 * Purge expired licensed provider payloads while keeping the derived analysis.
 * Intended for a scheduled job; safe to call ad hoc.
 */
export async function purgeExpiredProviderPayloads(now = new Date()): Promise<number> {
  // `providerDataExpiresAt` is only ever set when a payload was stored, so it
  // is a sufficient (and indexable) predicate on its own — a JSON-null filter
  // is not expressible in a `where` clause.
  const result = await prisma.solarRoofAnalysis.updateMany({
    where: { providerDataExpiresAt: { lt: now } },
    data: { rawProviderPayload: Prisma.DbNull, providerDataExpiresAt: null },
  });
  return result.count;
}
