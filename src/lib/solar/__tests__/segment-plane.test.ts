/**
 * Roof-plane outline recovery.
 *
 * The provider reports each roof face as an axis-aligned lat/lng bounding
 * box. segmentPlaneCorners inverts the bbox ↔ azimuth relationship so the
 * sunlight overlay and face outlines are drawn in the same rotated frame as
 * the panels — these tests lock that recovery math.
 */

import { describe, it, expect } from "vitest";
import { segmentPlaneCorners, boundingBoxCorners, toLatLng, extentOf } from "../geo";
import type { BoundingBox, LatLng } from "../types";

const origin: LatLng = { latitude: 39.084, longitude: -77.153 }; // Rockville, MD

/** Extent of the polygon along a unit direction. */
function extentAlong(pts: Array<{ x: number; y: number }>, ux: number, uy: number): number {
  const proj = pts.map((p) => p.x * ux + p.y * uy);
  return Math.max(...proj) - Math.min(...proj);
}

function centroid(pts: Array<{ x: number; y: number }>) {
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  };
}

function shoelace(pts: Array<{ x: number; y: number }>): number {
  return Math.abs(
    pts.reduce((s, p, i) => {
      const q = pts[(i + 1) % pts.length];
      return s + (p.x * q.y - q.x * p.y);
    }, 0) / 2,
  );
}

/** Build the axis-aligned bbox a W × H plane at azimuth `a` would produce. */
function bboxForPlane(acrossMeters: number, downMeters: number, azimuthDegrees: number): BoundingBox {
  const rad = (azimuthDegrees * Math.PI) / 180;
  const bx = acrossMeters * Math.abs(Math.cos(rad)) + downMeters * Math.abs(Math.sin(rad));
  const by = acrossMeters * Math.abs(Math.sin(rad)) + downMeters * Math.abs(Math.cos(rad));
  const sw = toLatLng({ x: -bx / 2, y: -by / 2 }, origin);
  const ne = toLatLng({ x: bx / 2, y: by / 2 }, origin);
  return { sw, ne };
}

describe("segmentPlaneCorners", () => {
  it("recovers the true plane dimensions and orientation across azimuths", () => {
    const W = 12; // across-slope (ridge) extent
    const H = 7; // down-slope extent
    for (const az of [0, 20, 90, 150, 180, 217, 300]) {
      const corners = segmentPlaneCorners({
        boundingBox: bboxForPlane(W, H, az),
        origin,
        azimuthDegrees: az,
      });
      const rad = (az * Math.PI) / 180;
      // Down-slope unit vector (azimuth clockwise from north) and its normal.
      expect(extentAlong(corners, Math.sin(rad), Math.cos(rad))).toBeCloseTo(H, 6);
      expect(extentAlong(corners, Math.cos(rad), -Math.sin(rad))).toBeCloseTo(W, 6);
      expect(shoelace(corners)).toBeCloseTo(W * H, 6);
    }
  });

  it("keeps the bbox centre", () => {
    const box = bboxForPlane(12, 7, 33);
    const corners = segmentPlaneCorners({ boundingBox: box, origin, azimuthDegrees: 33 });
    const c = centroid(corners);
    expect(c.x).toBeCloseTo(0, 6);
    expect(c.y).toBeCloseTo(0, 6);
  });

  it("matches the axis-aligned bbox exactly for a due-south plane", () => {
    const box = bboxForPlane(12, 7, 180);
    const recovered = segmentPlaneCorners({ boundingBox: box, origin, azimuthDegrees: 180 });
    const extent = extentOf(recovered)!;
    const axisAligned = extentOf(boundingBoxCorners(box, origin))!;
    expect(extent.maxX - extent.minX).toBeCloseTo(axisAligned.maxX - axisAligned.minX, 6);
    expect(extent.maxY - extent.minY).toBeCloseTo(axisAligned.maxY - axisAligned.minY, 6);
    expect(shoelace(recovered)).toBeCloseTo(shoelace(boundingBoxCorners(box, origin)), 6);
  });

  it("falls back to the axis-aligned box near 45° where W and H are inseparable", () => {
    const box = bboxForPlane(12, 7, 45);
    const recovered = segmentPlaneCorners({ boundingBox: box, origin, azimuthDegrees: 45 });
    const axisAligned = boundingBoxCorners(box, origin);
    expect(recovered).toEqual(axisAligned);
  });

  it("never returns a collapsed or inverted outline for odd inputs", () => {
    for (const az of [44, 46, 135, 225, 315]) {
      const corners = segmentPlaneCorners({
        boundingBox: bboxForPlane(12, 7, az),
        origin,
        azimuthDegrees: az,
      });
      expect(shoelace(corners)).toBeGreaterThan(0);
    }
  });
});
