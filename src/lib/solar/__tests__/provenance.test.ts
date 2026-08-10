/**
 * Provenance and geometry.
 *
 * The provenance rules are load-bearing: they are what stop an unconfirmed AI
 * extraction reaching a financial calculation, and what make "Why this number?"
 * derivable rather than authored.
 */

import { describe, it, expect } from "vitest";
import {
  fromApi,
  fromCalculation,
  fromHomeowner,
  fromAiExtraction,
  assumed,
  confirm,
  isUsableForFinance,
  weakestConfidence,
  anyAssumed,
  collectAssumptions,
  explain,
  sourceLabel,
} from "../provenance";
import { toPlanar, toLatLng, panelCorners, compassLabel, squareMetersToSquareFeet, viewBoxFor, extentOf } from "../geo";

describe("provenance", () => {
  it("marks assumptions distinctly from sourced values", () => {
    const sourced = fromApi(1200, { sourceName: "Google Solar", unit: "kWh" });
    const guess = assumed(0.85, { explanation: "Assumed DC-to-AC ratio" });

    expect(sourced.provenance.isAssumption).toBe(false);
    expect(sourced.provenance.confidence).toBe("HIGH");
    expect(guess.provenance.isAssumption).toBe(true);
    expect(guess.provenance.confidence).toBe("LOW");
  });

  it("blocks unconfirmed AI extraction from financial use", () => {
    const draft = fromAiExtraction(1350, { sourceName: "bill OCR", explanation: "Read from your bill" });
    expect(isUsableForFinance(draft.provenance)).toBe(false);

    const confirmed = confirm(draft);
    expect(isUsableForFinance(confirmed.provenance)).toBe(true);
    expect(confirmed.provenance.isUserConfirmed).toBe(true);
  });

  it("treats a corrected AI draft as the homeowner's own value", () => {
    const draft = fromAiExtraction(1350, { sourceName: "bill OCR", explanation: "Read from your bill" });
    const corrected = confirm(draft, 1400);
    expect(corrected.value).toBe(1400);
    expect(corrected.provenance.sourceType).toBe("homeowner_input");
    expect(corrected.provenance.isUserProvided).toBe(true);
    expect(corrected.provenance.confidence).toBe("HIGH");
  });

  it("inherits the weakest confidence across inputs", () => {
    const a = fromApi(1, { sourceName: "x" });
    const b = fromHomeowner(2, { explanation: "y" });
    const c = assumed(3, { explanation: "z" });
    expect(weakestConfidence(a)).toBe("HIGH");
    expect(weakestConfidence(a, b)).toBe("MEDIUM");
    expect(weakestConfidence(a, b, c)).toBe("LOW");
    expect(weakestConfidence(a, null, undefined)).toBe("HIGH");
  });

  it("collects distinct assumption explanations for display", () => {
    const a = assumed(1, { explanation: "Assumed A" });
    const b = assumed(2, { explanation: "Assumed A" });
    const c = assumed(3, { explanation: "Assumed B" });
    const sourced = fromApi(4, { sourceName: "x" });

    expect(anyAssumed(sourced)).toBe(false);
    expect(anyAssumed(sourced, a)).toBe(true);
    expect(collectAssumptions([a, b, c, sourced])).toEqual(["Assumed A", "Assumed B"]);
  });

  it("produces a homeowner-readable explanation for every source type", () => {
    const calc = fromCalculation(9.03, {
      calculationVersion: "v1",
      explanation: "21 panels × 430 W",
      derivedFrom: ["panel count", "panel capacity"],
    });
    const detail = explain(calc);
    expect(detail.explanation).toContain("430");
    expect(detail.sourceLabel).toBe("Calculated from the values above");
    expect(detail.derivedFrom).toEqual(["panel count", "panel capacity"]);

    expect(sourceLabel(assumed(1, { explanation: "x" }).provenance)).toContain("not a measured value");
    expect(
      sourceLabel(fromAiExtraction(1, { sourceName: "x", explanation: "y" }).provenance),
    ).toContain("needs your confirmation");
  });

  it("never leaves a value without an explanation slot", () => {
    const bare = fromApi(1, { sourceName: "x" });
    expect(explain(bare).explanation).toBeTruthy();
  });
});

describe("geographic projection", () => {
  const origin = { latitude: 39.084, longitude: -77.153 };

  it("round-trips a coordinate through the planar frame", () => {
    const point = { latitude: 39.0845, longitude: -77.1525 };
    const back = toLatLng(toPlanar(point, origin), origin);
    expect(back.latitude).toBeCloseTo(point.latitude, 9);
    expect(back.longitude).toBeCloseTo(point.longitude, 9);
  });

  it("places the origin at zero", () => {
    const p = toPlanar(origin, origin);
    expect(p.x).toBeCloseTo(0, 9);
    expect(p.y).toBeCloseTo(0, 9);
  });

  it("measures a known northward offset in metres", () => {
    // 0.001 degrees of latitude is ~111.32 m.
    const p = toPlanar({ latitude: origin.latitude + 0.001, longitude: origin.longitude }, origin);
    expect(p.y).toBeCloseTo(111.32, 2);
    expect(p.x).toBeCloseTo(0, 9);
  });

  const W = 1.045; // module short dimension
  const H = 1.879; // module long dimension

  const shoelace = (pts: Array<{ x: number; y: number }>) =>
    Math.abs(pts.reduce((s, p, i) => {
      const q = pts[(i + 1) % pts.length];
      return s + (p.x * q.y - q.x * p.y);
    }, 0) / 2);

  /** Extent of the rectangle along a unit direction. */
  const extentAlong = (pts: Array<{ x: number; y: number }>, ux: number, uy: number) => {
    const proj = pts.map((p) => p.x * ux + p.y * uy);
    return Math.max(...proj) - Math.min(...proj);
  };

  it("a flat panel keeps its true module footprint", () => {
    const corners = panelCorners({
      center: origin,
      origin,
      widthMeters: W,
      heightMeters: H,
      orientation: "LANDSCAPE",
      azimuthDegrees: 217,
      pitchDegrees: 0,
    });
    expect(corners).toHaveLength(4);
    expect(shoelace(corners)).toBeCloseTo(W * H, 6);
  });

  it("LANDSCAPE puts the module's long edge across the slope, not down it", () => {
    // South-facing: down-slope is due south (0,-1); across-slope is east (1,0).
    const corners = panelCorners({
      center: origin,
      origin,
      widthMeters: W,
      heightMeters: H,
      orientation: "LANDSCAPE",
      azimuthDegrees: 180,
      pitchDegrees: 0,
    });
    expect(extentAlong(corners, 0, 1)).toBeCloseTo(W, 6); // down-slope = SHORT
    expect(extentAlong(corners, 1, 0)).toBeCloseTo(H, 6); // across-slope = LONG
  });

  it("PORTRAIT is the reverse of LANDSCAPE", () => {
    const corners = panelCorners({
      center: origin,
      origin,
      widthMeters: W,
      heightMeters: H,
      orientation: "PORTRAIT",
      azimuthDegrees: 180,
      pitchDegrees: 0,
    });
    expect(extentAlong(corners, 0, 1)).toBeCloseTo(H, 6);
    expect(extentAlong(corners, 1, 0)).toBeCloseTo(W, 6);
  });

  it("foreshortens down-slope by cos(pitch) and leaves across-slope alone", () => {
    // This is what stops panels overhanging the roof in an overhead view.
    for (const pitch of [15, 25, 35, 45]) {
      const corners = panelCorners({
        center: origin,
        origin,
        widthMeters: W,
        heightMeters: H,
        orientation: "PORTRAIT",
        azimuthDegrees: 180,
        pitchDegrees: pitch,
      });
      const cos = Math.cos((pitch * Math.PI) / 180);
      expect(extentAlong(corners, 0, 1)).toBeCloseTo(H * cos, 6);
      expect(extentAlong(corners, 1, 0)).toBeCloseTo(W, 6);
      // Plan-view area shrinks by exactly cos(pitch).
      expect(shoelace(corners)).toBeCloseTo(W * H * cos, 6);
    }
  });

  it("never collapses or inverts on an out-of-range pitch", () => {
    for (const pitch of [-30, 95, 180]) {
      const area = shoelace(
        panelCorners({
          center: origin,
          origin,
          widthMeters: W,
          heightMeters: H,
          orientation: "LANDSCAPE",
          azimuthDegrees: 180,
          pitchDegrees: pitch,
        }),
      );
      expect(area).toBeGreaterThan(0);
      expect(area).toBeLessThanOrEqual(W * H + 1e-9);
    }
  });

  it("area is rotation-invariant across every azimuth", () => {
    for (let az = 0; az < 360; az += 30) {
      const area = shoelace(
        panelCorners({
          center: origin,
          origin,
          widthMeters: W,
          heightMeters: H,
          orientation: "LANDSCAPE",
          azimuthDegrees: az,
          pitchDegrees: 25,
        }),
      );
      expect(area).toBeCloseTo(W * H * Math.cos((25 * Math.PI) / 180), 6);
    }
  });

  it("gives a viewBox that covers the whole extent", () => {
    const extent = extentOf([
      { x: -5, y: -5 },
      { x: 5, y: 5 },
    ])!;
    const { viewBox, width, height } = viewBoxFor(extent);
    expect(width).toBe(10);
    expect(height).toBe(10);
    // y is flipped for screen space: the top of the box is the northern edge.
    expect(viewBox).toBe("-5 -5 10 10");
  });

  it("labels compass directions the way a homeowner would say them", () => {
    expect(compassLabel(0)).toBe("north");
    expect(compassLabel(180)).toBe("south");
    expect(compassLabel(225)).toBe("south-west");
    expect(compassLabel(359)).toBe("north");
    expect(compassLabel(-90)).toBe("west");
  });

  it("converts area units correctly", () => {
    expect(squareMetersToSquareFeet(10)).toBeCloseTo(107.639, 2);
  });
});
