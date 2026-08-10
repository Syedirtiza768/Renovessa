/**
 * Geographic projection helpers for the roof visualizer.
 *
 * The visualizer draws real provider geometry (segment bounding boxes and
 * candidate panel centres) rather than a decorative illustration, so the
 * lat/lng values need a planar frame. Over a single building — tens of metres
 * — an equirectangular projection about the site latitude is accurate to well
 * under a centimetre, which is far finer than the underlying roof data.
 *
 * Pure functions, no DOM: unit-testable and usable on both sides.
 */

import type { LatLng, BoundingBox } from "./types";

/** Metres per degree of latitude. Constant enough at building scale. */
export const METERS_PER_DEG_LAT = 111_320;

export interface PlanarPoint {
  /** Metres east of the origin. */
  x: number;
  /** Metres north of the origin. */
  y: number;
}

/** Project a lat/lng to metres east/north of `origin`. */
export function toPlanar(point: LatLng, origin: LatLng): PlanarPoint {
  const latRad = (origin.latitude * Math.PI) / 180;
  return {
    x: (point.longitude - origin.longitude) * METERS_PER_DEG_LAT * Math.cos(latRad),
    y: (point.latitude - origin.latitude) * METERS_PER_DEG_LAT,
  };
}

/** Inverse of `toPlanar`. */
export function toLatLng(point: PlanarPoint, origin: LatLng): LatLng {
  const latRad = (origin.latitude * Math.PI) / 180;
  return {
    latitude: origin.latitude + point.y / METERS_PER_DEG_LAT,
    longitude: origin.longitude + point.x / (METERS_PER_DEG_LAT * Math.cos(latRad)),
  };
}

/** Great-circle-free distance in metres. Adequate at building scale. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const p = toPlanar(b, a);
  return Math.hypot(p.x, p.y);
}

export interface PlanarExtent {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function extentOf(points: PlanarPoint[]): PlanarExtent | null {
  if (!points.length) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
}

export function padExtent(extent: PlanarExtent, meters: number): PlanarExtent {
  return {
    minX: extent.minX - meters,
    maxX: extent.maxX + meters,
    minY: extent.minY - meters,
    maxY: extent.maxY + meters,
  };
}

/**
 * Build an SVG viewBox for a planar extent.
 *
 * SVG y grows downward while "north" grows upward, so the caller renders with
 * y negated; this returns the box in that already-flipped space.
 */
export function viewBoxFor(extent: PlanarExtent): { viewBox: string; width: number; height: number } {
  const width = Math.max(1, extent.maxX - extent.minX);
  const height = Math.max(1, extent.maxY - extent.minY);
  // y is flipped: the top of the box is the northern edge.
  return {
    viewBox: `${extent.minX} ${-extent.maxY} ${width} ${height}`,
    width,
    height,
  };
}

/** The four corners of a provider bounding box, projected. */
export function boundingBoxCorners(box: BoundingBox, origin: LatLng): PlanarPoint[] {
  const { sw, ne } = box;
  const corners: LatLng[] = [
    { latitude: sw.latitude, longitude: sw.longitude },
    { latitude: sw.latitude, longitude: ne.longitude },
    { latitude: ne.latitude, longitude: ne.longitude },
    { latitude: ne.latitude, longitude: sw.longitude },
  ];
  return corners.map((c) => toPlanar(c, origin));
}

/**
 * Corner points of a roof plane as it appears from directly overhead,
 * aligned to the plane's azimuth — the same frame panels are drawn in.
 *
 * The provider supplies only an axis-aligned lat/lng bounding box. Rendered
 * as-is, the sunlight overlay sits at a visibly wrong angle over any roof
 * whose ridge does not run north–south/east–west. But a rectangular plane of
 * across-slope width W and down-slope height H at azimuth a produces an
 * axis-aligned bbox of exactly (W·|cos a| + H·|sin a|) ×
 * (W·|sin a| + H·|cos a|), so W and H can be recovered by inverting that
 * 2×2 system and the azimuth-aligned outline redrawn at the bbox centre.
 * The result lines up with the roof edges in the photo and with the panels.
 *
 * Degenerate near a = 45° + k·90° (the bbox is square and W, H cannot be
 * separated) and for non-rectangular planes; in both cases the original
 * axis-aligned box is a same-centre fallback rather than a wrong answer.
 */
export function segmentPlaneCorners(opts: {
  boundingBox: BoundingBox;
  origin: LatLng;
  azimuthDegrees: number;
}): PlanarPoint[] {
  const axisAligned = boundingBoxCorners(opts.boundingBox, opts.origin);
  const extent = extentOf(axisAligned);
  if (!extent) return axisAligned;

  const bx = extent.maxX - extent.minX;
  const by = extent.maxY - extent.minY;
  const cx = (extent.minX + extent.maxX) / 2;
  const cy = (extent.minY + extent.maxY) / 2;

  const a = ((opts.azimuthDegrees % 360) + 360) % 360;
  const rad = (a * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const det = cos * cos - sin * sin; // cos(2a); vanishes at 45° + k·90°
  if (Math.abs(det) < 0.1) return axisAligned;

  const across = (bx * cos - by * sin) / det; // W, across-slope (ridge) extent
  const down = (by * cos - bx * sin) / det; // H, down-slope extent
  if (across <= 0 || down <= 0) return axisAligned;

  // Down-slope unit vector: azimuth is degrees clockwise from north.
  const dx = Math.sin(rad);
  const dy = Math.cos(rad);
  // Across-slope unit vector: down-slope rotated 90° clockwise.
  const rx = dy;
  const ry = -dx;

  const hw = across / 2;
  const hh = down / 2;
  return [
    { x: cx - hw * rx - hh * dx, y: cy - hw * ry - hh * dy },
    { x: cx + hw * rx - hh * dx, y: cy + hw * ry - hh * dy },
    { x: cx + hw * rx + hh * dx, y: cy + hw * ry + hh * dy },
    { x: cx - hw * rx + hh * dx, y: cy - hw * ry + hh * dy },
  ];
}

/**
 * Corner points of one panel as it appears **from directly overhead**, which
 * is the only view satellite imagery gives us.
 *
 * Two things decide the footprint, and getting either wrong makes panels
 * visibly overhang the roof:
 *
 * 1. **Which module edge runs down the slope.** The local `lx` axis of the
 *    rotation below points down-slope (verified: at azimuth 180 it maps to
 *    south). `LANDSCAPE` means the long edge lies horizontally *across* the
 *    slope, so the down-slope extent is the module's SHORT dimension.
 *    `PORTRAIT` is the reverse.
 *
 * 2. **Foreshortening.** A panel lying on a pitched roof is compressed along
 *    the slope when seen from above, by cos(pitch). The across-slope extent is
 *    horizontal and therefore unaffected. On a 25° roof that is a 10%
 *    compression; at 45° it is 29%.
 */
export function panelCorners(opts: {
  center: LatLng;
  origin: LatLng;
  /** Module short dimension, metres. */
  widthMeters: number;
  /** Module long dimension, metres. */
  heightMeters: number;
  orientation: "LANDSCAPE" | "PORTRAIT";
  azimuthDegrees: number;
  /** Roof plane pitch. 0 (flat) renders the true module footprint. */
  pitchDegrees?: number;
}): PlanarPoint[] {
  const c = toPlanar(opts.center, opts.origin);

  const isLandscape = opts.orientation === "LANDSCAPE";
  const downSlopeMeters = isLandscape ? opts.widthMeters : opts.heightMeters;
  const acrossSlopeMeters = isLandscape ? opts.heightMeters : opts.widthMeters;

  // Only the down-slope axis foreshortens. Clamp so a bad pitch can never
  // collapse or invert the rectangle.
  const pitch = Math.min(89, Math.max(0, opts.pitchDegrees ?? 0));
  const along = downSlopeMeters * Math.cos((pitch * Math.PI) / 180);
  const across = acrossSlopeMeters;

  const halfAlong = along / 2;
  const halfAcross = across / 2;

  // Azimuth is degrees clockwise from north; convert to a standard CCW angle.
  const theta = ((90 - opts.azimuthDegrees) * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  const local: Array<[number, number]> = [
    [-halfAlong, -halfAcross],
    [halfAlong, -halfAcross],
    [halfAlong, halfAcross],
    [-halfAlong, halfAcross],
  ];

  return local.map(([lx, ly]) => ({
    x: c.x + lx * cos - ly * sin,
    y: c.y + lx * sin + ly * cos,
  }));
}

/** Convert a planar polygon to an SVG points attribute (y flipped for screen space). */
export function toSvgPoints(points: PlanarPoint[]): string {
  return points.map((p) => `${round(p.x)},${round(-p.y)}`).join(" ");
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Compass label for an azimuth, for the accessible textual roof description. */
export function compassLabel(azimuthDegrees: number): string {
  const dirs = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
  const a = ((azimuthDegrees % 360) + 360) % 360;
  return dirs[Math.round(a / 45) % 8];
}

export const SQ_METERS_PER_SQ_FOOT = 0.092903;

export function metersToFeet(m: number): number {
  return m / 0.3048;
}

export function squareMetersToSquareFeet(m2: number): number {
  return m2 / SQ_METERS_PER_SQ_FOOT;
}
