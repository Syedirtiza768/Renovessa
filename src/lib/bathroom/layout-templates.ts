/**
 * Room layout templates and proposed-layout transforms.
 * Pure functions — no React / DB. Dimensions in inches.
 */

import type { FixturePlacement, LayoutGeometry, WallSegment } from "./geometry";

export type RoomSizeBand = "powder" | "small" | "medium" | "large";

export const ROOM_SIZE_BANDS: {
  id: RoomSizeBand;
  label: string;
  hint: string;
  lengthFt: number;
  widthFt: number;
  ceilingFt: number;
}[] = [
  { id: "powder", label: "Powder", hint: "~3×5 ft", lengthFt: 5, widthFt: 3, ceilingFt: 8 },
  { id: "small", label: "Small", hint: "~5×8 ft", lengthFt: 8, widthFt: 5, ceilingFt: 8 },
  { id: "medium", label: "Medium", hint: "~6×9 ft", lengthFt: 9, widthFt: 6, ceilingFt: 8 },
  { id: "large", label: "Large / primary", hint: "~8×12 ft", lengthFt: 12, widthFt: 8, ceilingFt: 9 },
];

const REDESIGN_OBJECTIVES = new Set([
  "layout_redesign",
  "full_gut",
  "tub_to_shower",
  "walk_in_shower",
  "curbless_shower",
  "accessibility_upgrade",
  "add_bathroom",
]);

export function needsProposedLayout(answers: Record<string, string>): boolean {
  return REDESIGN_OBJECTIVES.has(answers.projectObjective || "");
}

export function resolveRoomFeet(answers: Record<string, string>): {
  lengthFt: number;
  widthFt: number;
  ceilingFt: number;
} {
  const band = ROOM_SIZE_BANDS.find((b) => b.id === answers.roomSizeBand);
  const lengthFt = Number(answers.length) || band?.lengthFt || 8;
  const widthFt = Number(answers.width) || band?.widthFt || 5;
  const ceilingFt = Number(answers.ceilingHeight) || band?.ceilingFt || 8;
  return { lengthFt, widthFt, ceilingFt };
}

function rectWalls(lengthIn: number, widthIn: number): WallSegment[] {
  return [
    { x1: 0, y1: 0, x2: lengthIn, y2: 0 },
    { x1: lengthIn, y1: 0, x2: lengthIn, y2: widthIn },
    { x1: lengthIn, y1: widthIn, x2: 0, y2: widthIn },
    { x1: 0, y1: widthIn, x2: 0, y2: 0 },
  ];
}

function clampFixture(f: FixturePlacement, lengthIn: number, widthIn: number): FixturePlacement {
  return {
    ...f,
    w: Math.max(4, f.w),
    d: Math.max(4, f.d),
    x: Math.max(0, Math.min(f.x, Math.max(0, lengthIn - f.w))),
    y: Math.max(0, Math.min(f.y, Math.max(0, widthIn - f.d))),
  };
}

/**
 * Bootstrap an existing layout from bathroom type + room size.
 */
export function buildExistingTemplate(answers: Record<string, string>): LayoutGeometry {
  const { lengthFt, widthFt, ceilingFt } = resolveRoomFeet(answers);
  const L = lengthFt * 12;
  const W = widthFt * 12;
  const type = answers.bathroomType || "guest";

  const fixtures: FixturePlacement[] = [];

  // Door on short wall near origin
  fixtures.push({ type: "door", x: 6, y: 0, w: 32, d: 4, rotation: 0 });

  if (type === "powder") {
    fixtures.push({ type: "toilet", x: L - 34, y: W - 28, w: 28, d: 20, rotation: 0 });
    fixtures.push({ type: "sink", x: 12, y: W - 22, w: 24, d: 18, rotation: 0 });
  } else if (type === "accessible") {
    fixtures.push({ type: "toilet", x: L - 36, y: W - 30, w: 30, d: 22, rotation: 0 });
    fixtures.push({ type: "vanity", x: 12, y: W - 24, w: 36, d: 22, rotation: 0 });
    fixtures.push({ type: "shower", x: 12, y: 12, w: Math.min(60, L - 24), d: Math.min(48, W - 40), rotation: 0 });
  } else {
    // guest / primary / basement / other — tub along far long wall, vanity + toilet opposite
    const tubW = Math.min(60, L - 24);
    fixtures.push({ type: "tub", x: (L - tubW) / 2, y: 6, w: tubW, d: 32, rotation: 0 });
    fixtures.push({ type: "toilet", x: L - 34, y: W - 28, w: 30, d: 20, rotation: 0 });
    const vanityW = type === "primary" ? 60 : 36;
    fixtures.push({
      type: "vanity",
      x: 12,
      y: W - 24,
      w: Math.min(vanityW, L - 50),
      d: 22,
      rotation: 0,
    });
  }

  fixtures.push({ type: "exhaust_fan", x: L / 2 - 6, y: W / 2 - 6, w: 12, d: 12, rotation: 0 });

  return {
    walls: rectWalls(L, W),
    fixtures: fixtures.map((f) => clampFixture(f, L, W)),
    ceilingHeight: ceilingFt * 12,
    unit: "in",
  };
}

/**
 * Derive a proposed layout from an existing one + project goals.
 * Never invents prices or diagnoses — geometry only.
 */
export function buildProposedFromExisting(
  existing: LayoutGeometry,
  answers: Record<string, string>,
): LayoutGeometry {
  const objective = answers.projectObjective || "";
  const walls = existing.walls.map((w) => ({ ...w }));
  let fixtures = existing.fixtures.map((f) => ({ ...f }));

  const lengthIn = Math.max(...walls.map((w) => Math.max(w.x1, w.x2)), 96);
  const widthIn = Math.max(...walls.map((w) => Math.max(w.y1, w.y2)), 60);

  const replaceTubWithShower = (curbless: boolean) => {
    const tubIdx = fixtures.findIndex((f) => f.type === "tub");
    if (tubIdx >= 0) {
      const tub = fixtures[tubIdx];
      fixtures[tubIdx] = {
        type: curbless ? "shower" : "shower_enclosure",
        x: tub.x,
        y: tub.y,
        w: Math.max(tub.w, 48),
        d: Math.max(tub.d, 36),
        rotation: tub.rotation ?? 0,
      };
    } else if (!fixtures.some((f) => f.type === "shower" || f.type === "shower_enclosure")) {
      fixtures.push({
        type: curbless ? "shower" : "shower_enclosure",
        x: 12,
        y: 12,
        w: 48,
        d: 36,
        rotation: 0,
      });
    }
  };

  if (
    objective === "tub_to_shower" ||
    objective === "walk_in_shower" ||
    answers.showerTub === "tub_to_shower_conversion" ||
    answers.showerTub === "custom_tiled_shower"
  ) {
    replaceTubWithShower(false);
  }

  if (objective === "curbless_shower" || answers.showerTub === "curbless_shower") {
    replaceTubWithShower(true);
  }

  if (answers.vanity === "double_sink" || answers.vanity === "double_vanity") {
    fixtures = fixtures.map((f) =>
      f.type === "vanity" || f.type === "sink"
        ? { ...f, type: "vanity", w: Math.min(72, Math.max(f.w, 60)) }
        : f,
    );
  }

  if (objective === "accessibility_upgrade" || answers.bathroomType === "accessible") {
    fixtures = fixtures.map((f) => {
      if (f.type === "toilet") return { ...f, w: Math.max(f.w, 30), d: Math.max(f.d, 22) };
      if (f.type === "tub") {
        return { type: "shower", x: f.x, y: f.y, w: Math.max(f.w, 60), d: Math.max(f.d, 36), rotation: f.rotation };
      }
      return f;
    });
    if (!fixtures.some((f) => f.type === "shower" || f.type === "shower_enclosure")) {
      replaceTubWithShower(true);
    }
  }

  if (objective === "cosmetic_refresh") {
    // Keep footprint — proposed mirrors existing
  }

  return {
    walls,
    fixtures: fixtures.map((f) => clampFixture(f, lengthIn, widthIn)),
    ceilingHeight: existing.ceilingHeight ?? 96,
    unit: existing.unit ?? "in",
  };
}

export function geometryFromFeet(
  lengthFt: number,
  widthFt: number,
  ceilingFt: number,
  fixtures: FixturePlacement[],
): LayoutGeometry {
  const L = lengthFt * 12;
  const W = widthFt * 12;
  return {
    walls: rectWalls(L, W),
    fixtures: fixtures.map((f) => clampFixture(f, L, W)),
    ceilingHeight: ceilingFt * 12,
    unit: "in",
  };
}

/** Whether Quick mode can skip the Basics step. */
export function hasBasicsFilled(answers: Record<string, string>): boolean {
  return Boolean(answers.bathroomType && (answers.propertyType || answers.zip || answers.city));
}

/** Whether Quick mode can skip Measurements. */
export function hasSizeFilled(answers: Record<string, string>): boolean {
  return Boolean(
    (answers.length && answers.width) ||
      answers.roomSizeBand ||
      answers.measurement_method === "simple",
  );
}

/** Whether Quick mode can skip Scope. */
export function hasScopeFilled(answers: Record<string, string>): boolean {
  return Boolean(answers.projectObjective || answers.showerTub || answers.vanity || answers.fixtureTier);
}

/** Whether Describe has enough content to proceed. */
export function hasCaptureContent(answers: Record<string, string>): boolean {
  const prompt = (answers.requirementsPrompt ?? "").trim();
  return prompt.length >= 10 || Boolean(answers.bathroomType) || Boolean(answers.photo_count);
}
