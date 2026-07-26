/**
 * Room layout templates and proposed-layout transforms.
 * Pure functions — no React / DB. Dimensions in inches.
 * Fixture x/y are TOP-LEFT corners.
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
  { id: "powder", label: "Powder", hint: "~4×5 ft", lengthFt: 5, widthFt: 4, ceilingFt: 8 },
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
  const w = Math.min(Math.max(4, f.w), lengthIn);
  const d = Math.min(Math.max(4, f.d), widthIn);
  return {
    ...f,
    w,
    d,
    x: Math.max(0, Math.min(f.x, Math.max(0, lengthIn - w))),
    y: Math.max(0, Math.min(f.y, Math.max(0, widthIn - d))),
  };
}

/**
 * Bootstrap an existing layout from bathroom type + room size.
 * Layouts are intentionally loose — avoid packing that triggers overlaps.
 */
export function buildExistingTemplate(answers: Record<string, string>): LayoutGeometry {
  const { lengthFt, widthFt, ceilingFt } = resolveRoomFeet(answers);
  const L = lengthFt * 12;
  const W = widthFt * 12;
  const type = answers.bathroomType || "guest";

  const fixtures: FixturePlacement[] = [];

  // Door centered on the near short wall (top edge)
  const doorW = Math.min(32, L - 12);
  fixtures.push({ type: "door", x: (L - doorW) / 2, y: 0, w: doorW, d: 4, rotation: 0 });

  if (type === "powder") {
    // Toilet on right wall, sink on left — leave aisle in middle
    fixtures.push({ type: "toilet", x: L - 30, y: Math.max(8, W - 28), w: 28, d: 20, rotation: 0 });
    fixtures.push({ type: "sink", x: 4, y: Math.max(8, W - 22), w: 22, d: 18, rotation: 0 });
  } else if (type === "accessible") {
    fixtures.push({ type: "toilet", x: L - 32, y: Math.max(10, W - 30), w: 30, d: 22, rotation: 0 });
    fixtures.push({ type: "vanity", x: 4, y: Math.max(10, W - 24), w: Math.min(36, L / 2 - 8), d: 21, rotation: 0 });
    const shW = Math.min(48, L - 16);
    const shD = Math.min(36, Math.max(30, W - 48));
    fixtures.push({ type: "shower", x: 4, y: 8, w: shW, d: shD, rotation: 0 });
  } else {
    // Tub along top wall (below door), vanity left-bottom, toilet right-bottom
    const tubW = Math.min(60, L - 16);
    const tubD = Math.min(30, Math.max(28, Math.floor(W * 0.35)));
    fixtures.push({ type: "tub", x: (L - tubW) / 2, y: 8, w: tubW, d: tubD, rotation: 0 });

    const vanityW = Math.min(type === "primary" ? 48 : 36, Math.floor(L * 0.4));
    fixtures.push({
      type: "vanity",
      x: 4,
      y: Math.max(tubD + 16, W - 22),
      w: vanityW,
      d: 21,
      rotation: 0,
    });
    fixtures.push({
      type: "toilet",
      x: L - 30,
      y: Math.max(tubD + 16, W - 26),
      w: 28,
      d: 20,
      rotation: 0,
    });
  }

  // No exhaust fan on the floor plan — it caused false overlap noise

  return {
    walls: rectWalls(L, W),
    fixtures: fixtures.map((f) => clampFixture(f, L, W)),
    ceilingHeight: ceilingFt * 12,
    unit: "in",
  };
}

/**
 * Derive a proposed layout from an existing one + project goals.
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
      // Keep footprint size so layout stays conflict-free; widen only if room allows
      const w = Math.min(Math.max(tub.w, 48), lengthIn - tub.x);
      const d = Math.min(Math.max(tub.d, 32), widthIn - tub.y);
      fixtures[tubIdx] = {
        type: curbless ? "shower" : "shower_enclosure",
        x: tub.x,
        y: tub.y,
        w,
        d,
        rotation: tub.rotation ?? 0,
      };
    } else if (!fixtures.some((f) => f.type === "shower" || f.type === "shower_enclosure")) {
      fixtures.push({
        type: curbless ? "shower" : "shower_enclosure",
        x: 8,
        y: 8,
        w: Math.min(48, lengthIn - 16),
        d: Math.min(36, widthIn - 40),
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
    fixtures = fixtures.map((f) => {
      if (f.type !== "vanity" && f.type !== "sink") return f;
      const w = Math.min(60, lengthIn - f.x);
      return { ...f, type: "vanity", w };
    });
  }

  if (objective === "accessibility_upgrade" || answers.bathroomType === "accessible") {
    fixtures = fixtures.map((f) => {
      if (f.type === "tub") {
        return {
          type: "shower",
          x: f.x,
          y: f.y,
          w: Math.min(Math.max(f.w, 48), lengthIn - f.x),
          d: Math.min(Math.max(f.d, 36), widthIn - f.y),
          rotation: f.rotation,
        };
      }
      return f;
    });
    if (!fixtures.some((f) => f.type === "shower" || f.type === "shower_enclosure")) {
      replaceTubWithShower(true);
    }
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

export function hasBasicsFilled(answers: Record<string, string>): boolean {
  return Boolean(answers.bathroomType && (answers.propertyType || answers.zip || answers.city));
}

export function hasSizeFilled(answers: Record<string, string>): boolean {
  return Boolean(
    (answers.length && answers.width) ||
      answers.roomSizeBand ||
      answers.measurement_method === "simple",
  );
}

export function hasScopeFilled(answers: Record<string, string>): boolean {
  return Boolean(answers.projectObjective || answers.showerTub || answers.vanity || answers.fixtureTier);
}

export function hasCaptureContent(answers: Record<string, string>): boolean {
  const prompt = (answers.requirementsPrompt ?? "").trim();
  return prompt.length >= 10 || Boolean(answers.bathroomType) || Boolean(answers.photo_count);
}
