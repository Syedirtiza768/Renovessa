/**
 * Geometry calculations for bathroom layouts (PRD §14.4).
 * Pure functions. No DOM, no React. Fully unit-testable.
 *
 * Geometry is stored as a normalized JSON structure:
 *   { walls: [{ x1, y1, x2, y2, thickness }], fixtures: [{ type, x, y, w, d, rotation }] }
 * All units are inches (imperial default). Conversion helpers provided.
 */

export interface WallSegment {
  x1: number; y1: number; x2: number; y2: number;
  thickness?: number;
}
export interface FixturePlacement {
  type: string;
  x: number; y: number;
  w: number; d: number;
  rotation?: number;
}
export interface LayoutGeometry {
  walls: WallSegment[];
  fixtures: FixturePlacement[];
  ceilingHeight?: number;
  unit?: "in" | "cm";
}

export interface GeometryCalculations {
  floorAreaSqft: number;
  perimeterFt: number;
  paintableWallAreaSqft: number;
  wetWallAreaSqft: number;
  showerWallAreaSqft: number;
  tileAreaSqft: number;
  baseboardLengthFt: number;
  demolitionAreaSqft: number;
  fixtureCount: number;
  plumbingRelocationDistanceFt: number;
  electricalModificationCount: number;
  doorCount: number;
  windowCount: number;
  wasteAllowancePercent: number;
}

const INCHES_PER_FOOT = 12;
const SQ_IN_PER_SQ_FT = 144;

function inchesToFeet(inches: number): number {
  return inches / INCHES_PER_FOOT;
}

function wallLengthInches(w: WallSegment): number {
  return Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
}

/**
 * Shoelace polygon area for the room boundary formed by the wall segments.
 * Assumes walls form a closed polygon in order. Returns square inches.
 * If walls do not form a closed polygon, returns 0.
 */
function polygonAreaInches(walls: WallSegment[]): number {
  if (walls.length < 3) return 0;
  // Collect ordered vertices
  const pts: { x: number; y: number }[] = [];
  for (const w of walls) {
    if (pts.length === 0) pts.push({ x: w.x1, y: w.y1 });
    pts.push({ x: w.x2, y: w.y2 });
  }
  // Close the loop check
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (Math.abs(first.x - last.x) > 0.5 || Math.abs(first.y - last.y) > 0.5) {
    // Not closed — approximate by closing
    pts.push({ x: first.x, y: first.y });
  }
  let sum = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    sum += pts[i].x * pts[i + 1].y - pts[i + 1].x * pts[i].y;
  }
  return Math.abs(sum) / 2;
}

export function calculateGeometry(geometry: LayoutGeometry): GeometryCalculations {
  const walls = geometry.walls ?? [];
  const fixtures = geometry.fixtures ?? [];
  const ceilingHeightIn = geometry.ceilingHeight ?? 96; // 8 ft default

  const floorAreaIn = polygonAreaInches(walls);
  const floorAreaSqft = floorAreaIn / SQ_IN_PER_SQ_FT;

  const perimeterIn = walls.reduce((sum, w) => sum + wallLengthInches(w), 0);
  const perimeterFt = inchesToFeet(perimeterIn);

  // Paintable wall area = perimeter * ceiling height, minus openings (rough)
  const doorCount = fixtures.filter((f) => f.type === "door").length;
  const windowCount = fixtures.filter((f) => f.type === "window").length;
  const doorOpeningAreaIn = doorCount * 32 * 80; // 32" x 80" per door
  const windowOpeningAreaIn = windowCount * 36 * 48; // 36x48 avg
  const grossWallAreaIn = perimeterIn * ceilingHeightIn;
  const paintableWallAreaSqft = Math.max(0, (grossWallAreaIn - doorOpeningAreaIn - windowOpeningAreaIn) / SQ_IN_PER_SQ_FT);

  // Wet wall = wall length behind plumbing fixtures (toilet, vanity, tub, shower)
  const plumbingFixtureTypes = ["toilet", "vanity", "sink", "tub", "shower", "shower_enclosure"];
  const wetWallLengthIn = fixtures
    .filter((f) => plumbingFixtureTypes.includes(f.type))
    .reduce((sum, f) => sum + Math.max(f.w, f.d), 0);
  const wetWallAreaSqft = (wetWallLengthIn * ceilingHeightIn) / SQ_IN_PER_SQ_FT;

  // Shower wall area = shower perimeter * ceiling height
  const showerFixtures = fixtures.filter((f) => ["shower", "shower_enclosure", "tub"].includes(f.type));
  const showerWallLengthIn = showerFixtures.reduce((sum, f) => sum + 2 * (f.w + f.d), 0);
  const showerWallAreaSqft = (showerWallLengthIn * ceilingHeightIn) / SQ_IN_PER_SQ_FT;

  // Tile area: shower walls + floor (if tiled) — conservative default tiles floor + shower
  const tileAreaSqft = floorAreaSqft + showerWallAreaSqft;

  // Baseboard = perimeter minus door openings
  const baseboardLengthFt = Math.max(0, inchesToFeet(perimeterIn - doorCount * 32));

  // Demolition area = floor area (full gut assumption; refined by objective upstream)
  const demolitionAreaSqft = floorAreaSqft;

  const fixtureCount = fixtures.filter((f) => !["door", "window"].includes(f.type)).length;

  // Plumbing relocation distance — sum of distances between paired existing/proposed fixtures
  // Simplified: count of fixtures flagged "moved" times average relocation (5 ft)
  const movedFixtures = fixtures.filter((f) => (f as any).proposedAction === "move").length;
  const plumbingRelocationDistanceFt = movedFixtures * 5;

  // Electrical modifications — outlets/switches/lighting added or moved
  const electricalModificationCount = fixtures.filter(
    (f) => ["outlet", "switch", "lighting", "exhaust_fan"].includes(f.type) && (f as any).proposedAction === "add",
  ).length;

  // Waste allowance: 10% for tile, 15% for natural stone (default 10%)
  const wasteAllowancePercent = 10;

  return {
    floorAreaSqft: round2(floorAreaSqft),
    perimeterFt: round2(perimeterFt),
    paintableWallAreaSqft: round2(paintableWallAreaSqft),
    wetWallAreaSqft: round2(wetWallAreaSqft),
    showerWallAreaSqft: round2(showerWallAreaSqft),
    tileAreaSqft: round2(tileAreaSqft),
    baseboardLengthFt: round2(baseboardLengthFt),
    demolitionAreaSqft: round2(demolitionAreaSqft),
    fixtureCount,
    plumbingRelocationDistanceFt,
    electricalModificationCount,
    doorCount,
    windowCount,
    wasteAllowancePercent,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Convert inches to feet/inches display string, e.g. 90 -> "7' 6\"" */
export function formatInchesAsFeetInches(inches: number): string {
  const ft = Math.floor(inches / INCHES_PER_FOOT);
  const rem = Math.round(inches % INCHES_PER_FOOT);
  return rem === 0 ? `${ft}'` : `${ft}' ${rem}"`;
}

/** Convert cm to inches */
export function cmToInches(cm: number): number {
  return cm / 2.54;
}

/** Convert inches to cm */
export function inchesToCm(inches: number): number {
  return inches * 2.54;
}
