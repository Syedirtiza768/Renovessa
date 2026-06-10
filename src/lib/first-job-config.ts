/**
 * First-Job MVP wedge config.
 * Env-driven: set FIRST_JOB_MODE=true to constrain the platform
 * to a single pilot contractor, trade, and ZIP cluster.
 */

export const FIRST_JOB_MODE = process.env.FIRST_JOB_MODE === "true";

export const PILOT_TRADE = process.env.PILOT_TRADE || "HVAC";
export const PILOT_ZIP_CLUSTERS = (process.env.PILOT_ZIP_CLUSTERS || "")
  .split(",")
  .map((z) => z.trim())
  .filter(Boolean);
export const PILOT_MIN_BUDGET = parseInt(process.env.PILOT_MIN_BUDGET || "1000", 10);
export const PILOT_CONTRACTOR_ID = process.env.PILOT_CONTRACTOR_ID || "";
export const OPS_PHONE = process.env.NEXT_PUBLIC_OPS_PHONE || "";
export const LANDING_HEADLINE = process.env.NEXT_PUBLIC_LANDING_HEADLINE || "";

/**
 * Returns true if the given zip matches the pilot cluster.
 * If FIRST_JOB_MODE is off or no zips configured, always returns true.
 */
export function matchesPilotCell(zip: string): boolean {
  if (!FIRST_JOB_MODE || PILOT_ZIP_CLUSTERS.length === 0) return true;
  return PILOT_ZIP_CLUSTERS.includes(zip);
}

/**
 * Returns true if the given trade matches the pilot trade.
 * If FIRST_JOB_MODE is off, always returns true.
 */
export function matchesPilotTrade(trade: string): boolean {
  if (!FIRST_JOB_MODE) return true;
  return trade.toLowerCase().includes(PILOT_TRADE.toLowerCase());
}
