import { describe, it, expect } from "vitest";
import { calculateGeometry, formatInchesAsFeetInches, cmToInches, inchesToCm } from "@/lib/bathroom/geometry";

describe("geometry", () => {
  it("calculates floor area for a rectangular room", () => {
    const result = calculateGeometry({
      walls: [
        { x1: 0, y1: 0, x2: 96, y2: 0 },
        { x1: 96, y1: 0, x2: 96, y2: 60 },
        { x1: 96, y1: 60, x2: 0, y2: 60 },
        { x1: 0, y1: 60, x2: 0, y2: 0 },
      ],
      fixtures: [],
      ceilingHeight: 96,
    });
    // 8ft x 5ft = 40 sq ft
    expect(result.floorAreaSqft).toBe(40);
    // perimeter = 2*(8+5) = 26 ft
    expect(result.perimeterFt).toBe(26);
  });

  it("counts doors and windows", () => {
    const result = calculateGeometry({
      walls: [
        { x1: 0, y1: 0, x2: 96, y2: 0 },
        { x1: 96, y1: 0, x2: 96, y2: 60 },
        { x1: 96, y1: 60, x2: 0, y2: 60 },
        { x1: 0, y1: 60, x2: 0, y2: 0 },
      ],
      fixtures: [
        { type: "door", x: 0, y: 0, w: 32, d: 4 },
        { type: "window", x: 48, y: 0, w: 36, d: 4 },
      ],
      ceilingHeight: 96,
    });
    expect(result.doorCount).toBe(1);
    expect(result.windowCount).toBe(1);
  });

  it("reduces paintable wall area for openings", () => {
    const noOpenings = calculateGeometry({
      walls: [
        { x1: 0, y1: 0, x2: 96, y2: 0 },
        { x1: 96, y1: 0, x2: 96, y2: 60 },
        { x1: 96, y1: 60, x2: 0, y2: 60 },
        { x1: 0, y1: 60, x2: 0, y2: 0 },
      ],
      fixtures: [],
      ceilingHeight: 96,
    });
    const withDoor = calculateGeometry({
      walls: [
        { x1: 0, y1: 0, x2: 96, y2: 0 },
        { x1: 96, y1: 0, x2: 96, y2: 60 },
        { x1: 96, y1: 60, x2: 0, y2: 60 },
        { x1: 0, y1: 60, x2: 0, y2: 0 },
      ],
      fixtures: [{ type: "door", x: 0, y: 0, w: 32, d: 4 }],
      ceilingHeight: 96,
    });
    expect(withDoor.paintableWallAreaSqft).toBeLessThan(noOpenings.paintableWallAreaSqft);
  });

  it("formats inches as feet and inches", () => {
    expect(formatInchesAsFeetInches(96)).toBe("8'");
    expect(formatInchesAsFeetInches(90)).toBe("7' 6\"");
    expect(formatInchesAsFeetInches(0)).toBe("0'");
  });

  it("converts cm to inches and back", () => {
    expect(cmToInches(2.54)).toBeCloseTo(1, 2);
    expect(inchesToCm(1)).toBeCloseTo(2.54, 2);
  });

  it("returns zero area for fewer than 3 walls", () => {
    const result = calculateGeometry({
      walls: [{ x1: 0, y1: 0, x2: 96, y2: 0 }],
      fixtures: [],
    });
    expect(result.floorAreaSqft).toBe(0);
  });
});
