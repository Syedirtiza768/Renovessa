/**
 * Resolve the active solar pricing/model configuration.
 *
 * Prefers the most recently published, in-date `SolarEstimatorConfiguration`
 * row; falls back to the built-in planning default (which is fail-closed for
 * public dollar display). Mirrors how the bathroom estimator resolves its
 * configuration, minus that route's habit of silently defaulting.
 */

import { prisma } from "@/lib/db";
import {
  DEFAULT_SOLAR_PRICING_CONFIG,
  mergePricingConfig,
  type SolarPricingConfig,
} from "./pricing-config";

export interface ResolvedPricingConfig {
  config: SolarPricingConfig;
  /** Null when the built-in default was used. */
  configurationId: string | null;
}

export async function resolvePricingConfig(now = new Date()): Promise<ResolvedPricingConfig> {
  try {
    const published = await prisma.solarEstimatorConfiguration.findFirst({
      where: {
        status: "PUBLISHED",
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
      },
      orderBy: { publishedAt: "desc" },
    });

    if (!published) {
      return { config: DEFAULT_SOLAR_PRICING_CONFIG, configurationId: null };
    }

    const merged = mergePricingConfig(
      published.configurationJson as Partial<SolarPricingConfig>,
      published.version,
    );

    return {
      config: {
        ...merged,
        market: published.market,
        dataBasis: published.dataBasis as SolarPricingConfig["dataBasis"],
        sampleCount: published.sampleCount,
        effectiveFrom: published.validFrom.toISOString().slice(0, 10),
        mostRecentSampleDate: published.mostRecentSampleDate?.toISOString().slice(0, 10),
        reviewedBy: published.approvedBy ?? undefined,
      },
      configurationId: published.id,
    };
  } catch (e) {
    // A config lookup failure must not take the planner down; the default is
    // fail-closed for prices, so degrading to it is safe.
    console.error("solar pricing config lookup failed", e);
    return { config: DEFAULT_SOLAR_PRICING_CONFIG, configurationId: null };
  }
}
