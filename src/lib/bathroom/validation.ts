/**
 * Layout validation rules (PRD §14.5).
 *
 * FixturePlacement.x/y are TOP-LEFT corners (matches DiagramBuilder + templates).
 * Planner UX treats most issues as advisory — homeowners sketch approximate layouts.
 */

import type { LayoutGeometry, FixturePlacement } from "./geometry";

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationIssue {
  severity: ValidationSeverity;
  rule: string;
  message: string;
  fixtureType?: string;
}

const MIN_SHOWER_WIDTH_INCHES = 30;
const MIN_SHOWER_AREA_SQFT = 9;

/** Types that sit on walls / ceiling and should not drive harsh floor checks. */
const NON_SOLID = new Set(["door", "window", "exhaust_fan"]);

/** AABB using top-left origin (x, y, w, d). */
function aabb(f: FixturePlacement) {
  return {
    minX: f.x,
    maxX: f.x + f.w,
    minY: f.y,
    maxY: f.y + f.d,
  };
}

function overlap(a: FixturePlacement, b: FixturePlacement): boolean {
  const A = aabb(a);
  const B = aabb(b);
  return A.minX < B.maxX && A.maxX > B.minX && A.minY < B.maxY && A.maxY > B.minY;
}

function roomBounds(geometry: LayoutGeometry) {
  if (geometry.walls.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const w of geometry.walls) {
    minX = Math.min(minX, w.x1, w.x2);
    minY = Math.min(minY, w.y1, w.y2);
    maxX = Math.max(maxX, w.x1, w.x2);
    maxY = Math.max(maxY, w.y1, w.y2);
  }
  return { minX, minY, maxX, maxY };
}

export function validateLayout(geometry: LayoutGeometry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const fixtures = geometry.fixtures ?? [];
  const walls = geometry.walls ?? [];

  if (walls.length < 3) {
    issues.push({
      severity: "error",
      rule: "incomplete_geometry",
      message: "Add walls to define the room outline.",
    });
  }

  if (!geometry.ceilingHeight || geometry.ceilingHeight <= 0) {
    issues.push({
      severity: "info",
      rule: "missing_ceiling_height",
      message: "Ceiling height not set — using 8 ft for area estimates.",
    });
  }

  const bounds = roomBounds(geometry);
  const solidFixtures = fixtures.filter((f) => !NON_SOLID.has(f.type));

  // Clearly outside the room (allow 2" tolerance for wall-mounted doors)
  if (bounds) {
    for (const f of fixtures) {
      if (f.type === "exhaust_fan") continue;
      const A = aabb(f);
      const tol = f.type === "door" || f.type === "window" ? 4 : 2;
      if (
        A.minX < bounds.minX - tol ||
        A.maxX > bounds.maxX + tol ||
        A.minY < bounds.minY - tol ||
        A.maxY > bounds.maxY + tol
      ) {
        issues.push({
          severity: "warning",
          rule: "fixture_outside_boundary",
          message: `${pretty(f.type)} looks outside the room — drag it back in.`,
          fixtureType: f.type,
        });
      }
    }
  }

  // Overlaps — advisory in planner (approximate sketches)
  for (let i = 0; i < solidFixtures.length; i++) {
    for (let j = i + 1; j < solidFixtures.length; j++) {
      if (overlap(solidFixtures[i], solidFixtures[j])) {
        issues.push({
          severity: "warning",
          rule: "fixture_overlap",
          message: `${pretty(solidFixtures[i].type)} and ${pretty(solidFixtures[j].type)} overlap — nudge one aside if you can.`,
          fixtureType: solidFixtures[i].type,
        });
      }
    }
  }

  // Shower size — soft
  const showers = fixtures.filter((f) => ["shower", "shower_enclosure"].includes(f.type));
  for (const s of showers) {
    const areaSqft = (s.w * s.d) / 144;
    if (s.w < MIN_SHOWER_WIDTH_INCHES || s.d < MIN_SHOWER_WIDTH_INCHES) {
      issues.push({
        severity: "info",
        rule: "shower_too_small",
        message: `Shower is under ${MIN_SHOWER_WIDTH_INCHES}" in one direction — contractors often prefer larger.`,
        fixtureType: "shower",
      });
    } else if (areaSqft < MIN_SHOWER_AREA_SQFT) {
      issues.push({
        severity: "info",
        rule: "shower_small",
        message: `Shower is about ${areaSqft.toFixed(0)} sq ft; ${MIN_SHOWER_AREA_SQFT}+ sq ft is a common target.`,
        fixtureType: "shower",
      });
    }
  }

  // Door blocked by fixture — soft tip only
  const doors = fixtures.filter((f) => f.type === "door");
  for (const d of doors) {
    for (const f of solidFixtures) {
      if (overlap(d, f)) {
        issues.push({
          severity: "info",
          rule: "door_blocked",
          message: `Door may swing into the ${pretty(f.type)} — check clearance later with your contractor.`,
          fixtureType: f.type,
        });
      }
    }
  }

  // Note: we intentionally do NOT warn about fixtures against walls.
  // Vanities/toilets/tubs sit on walls; "narrow circulation" flooded false alarms.

  return issues;
}

function pretty(type: string) {
  return type.replace(/_/g, " ");
}

export function hasBlockingErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}

export function summarizeValidation(issues: ValidationIssue[]) {
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const infos = issues.filter((i) => i.severity === "info");
  return {
    errorCount: errors.length,
    warningCount: warnings.length,
    infoCount: infos.length,
    // Only incomplete geometry blocks — overlaps/out-of-bounds are soft for sketches
    blocking: errors.length > 0,
    summary: errors.length
      ? `${errors.length} issue(s) to fix before saving a complete room outline.`
      : warnings.length
        ? `${warnings.length} tip(s) — you can still continue.`
        : infos.length
          ? `${infos.length} note(s) — layout looks usable.`
          : "Looks good enough to continue.",
  };
}
