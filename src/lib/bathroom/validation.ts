/**
 * Layout validation rules (PRD §14.5).
 * Returns advisory warnings and hard errors. Warnings are advisory unless
 * a configuration is geometrically impossible (errors block estimate).
 */

import type { LayoutGeometry, FixturePlacement } from "./geometry";

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  severity: ValidationSeverity;
  rule: string;
  message: string;
  fixtureType?: string;
}

const MIN_CIRCULATION_INCHES = 30; // 30" min clearance
const MIN_SHOWER_WIDTH_INCHES = 30;
const MIN_SHOWER_AREA_SQFT = 9; // 30x36 minimum

function aabb(f: FixturePlacement) {
  return {
    minX: f.x - f.w / 2,
    maxX: f.x + f.w / 2,
    minY: f.y - f.d / 2,
    maxY: f.y + f.d / 2,
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

  // 1. Incomplete room geometry
  if (walls.length < 3) {
    issues.push({
      severity: "error",
      rule: "incomplete_geometry",
      message: "Room boundary requires at least 3 walls. Add walls to define the room.",
    });
  }

  // 2. Missing critical dimensions (no ceiling height)
  if (!geometry.ceilingHeight || geometry.ceilingHeight <= 0) {
    issues.push({
      severity: "warning",
      rule: "missing_ceiling_height",
      message: "Ceiling height is not set. Paint and tile area calculations will use an 8 ft default.",
    });
  }

  const bounds = roomBounds(geometry);

  // 3. Fixture outside room boundary
  if (bounds) {
    for (const f of fixtures) {
      const A = aabb(f);
      if (
        A.minX < bounds.minX - 1 || A.maxX > bounds.maxX + 1 ||
        A.minY < bounds.minY - 1 || A.maxY > bounds.maxY + 1
      ) {
        issues.push({
          severity: "error",
          rule: "fixture_outside_boundary",
          message: `${f.type} is outside the room boundary.`,
          fixtureType: f.type,
        });
      }
    }
  }

  // 4. Overlapping fixtures (exclude doors/windows from overlap check)
  const solidFixtures = fixtures.filter((f) => !["door", "window"].includes(f.type));
  for (let i = 0; i < solidFixtures.length; i++) {
    for (let j = i + 1; j < solidFixtures.length; j++) {
      if (overlap(solidFixtures[i], solidFixtures[j])) {
        issues.push({
          severity: "error",
          rule: "fixture_overlap",
          message: `${solidFixtures[i].type} and ${solidFixtures[j].type} overlap.`,
          fixtureType: solidFixtures[i].type,
        });
      }
    }
  }

  // 5. Shower too small
  const showers = fixtures.filter((f) => ["shower", "shower_enclosure"].includes(f.type));
  for (const s of showers) {
    const areaSqft = (s.w * s.d) / 144;
    if (s.w < MIN_SHOWER_WIDTH_INCHES || s.d < MIN_SHOWER_WIDTH_INCHES) {
      issues.push({
        severity: "error",
        rule: "shower_too_small",
        message: `Shower is smaller than ${MIN_SHOWER_WIDTH_INCHES}" in one dimension.`,
        fixtureType: "shower",
      });
    } else if (areaSqft < MIN_SHOWER_AREA_SQFT) {
      issues.push({
        severity: "warning",
        rule: "shower_small",
        message: `Shower area is ${areaSqft.toFixed(1)} sq ft; consider at least ${MIN_SHOWER_AREA_SQFT} sq ft.`,
        fixtureType: "shower",
      });
    }
  }

  // 6. Curbless shower structural review flag
  const curbless = fixtures.find((f) => f.type === "shower" && (f as any).curbless === true);
  if (curbless) {
    issues.push({
      severity: "warning",
      rule: "curbless_structural_review",
      message: "Curbless showers often require floor recessing and drainage modifications. Contractor or design professional must verify feasibility.",
      fixtureType: "shower",
    });
  }

  // 7. Door collision with fixtures
  const doors = fixtures.filter((f) => f.type === "door");
  for (const d of doors) {
    for (const f of solidFixtures) {
      if (overlap(d, f)) {
        issues.push({
          severity: "warning",
          rule: "door_blocked",
          message: `Door swing overlaps ${f.type}. Verify clearance.`,
          fixtureType: f.type,
        });
      }
    }
  }

  // 8. Unusually narrow circulation — crude check: any solid fixture within MIN_CIRCULATION of any wall
  if (bounds) {
    for (const f of solidFixtures) {
      const A = aabb(f);
      const clearanceLeft = A.minX - bounds.minX;
      const clearanceRight = bounds.maxX - A.maxX;
      const clearanceTop = A.minY - bounds.minY;
      const clearanceBottom = bounds.maxY - A.maxY;
      const minClearance = Math.min(clearanceLeft, clearanceRight, clearanceTop, clearanceBottom);
      if (minClearance >= 0 && minClearance < MIN_CIRCULATION_INCHES) {
        issues.push({
          severity: "warning",
          rule: "narrow_circulation",
          message: `Less than ${MIN_CIRCULATION_INCHES}" clearance around ${f.type}. Verify circulation.`,
          fixtureType: f.type,
        });
      }
    }
  }

  // 9. Unconfirmed measurement dependency
  if (geometry.ceilingHeight && geometry.ceilingHeight < 0) {
    issues.push({
      severity: "error",
      rule: "invalid_ceiling_height",
      message: "Ceiling height is negative. Correct the measurement.",
    });
  }

  return issues;
}

export function hasBlockingErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}

export function summarizeValidation(issues: ValidationIssue[]) {
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  return {
    errorCount: errors.length,
    warningCount: warnings.length,
    blocking: errors.length > 0,
    summary: errors.length
      ? `${errors.length} error(s) must be resolved before generating an estimate.`
      : warnings.length
        ? `${warnings.length} advisory warning(s). Estimate can be generated.`
        : "No issues detected.",
  };
}
