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
 * Corner points of one panel rectangle, rotated to sit square with the roof
 * plane it belongs to.
 *
 * A panel's long axis runs across the slope for LANDSCAPE and up it for
 * PORTRAIT. The plane's downslope direction is its azimuth, so rotating the
 * rectangle by the azimuth puts it on the roof the way it would really sit.
 */
export function panelCorners(opts: {
  center: LatLng;
  origin: LatLng;
  widthMeters: number;
  heightMeters: number;
  orientation: "LANDSCAPE" | "PORTRAIT";
  azimuthDegrees: number;
}): PlanarPoint[] {
  const c = toPlanar(opts.center, opts.origin);
  // In LANDSCAPE the module's long edge is horizontal across the slope.
  const along = opts.orientation === "LANDSCAPE" ? opts.heightMeters : opts.widthMeters;
  const across = opts.orientation === "LANDSCAPE" ? opts.widthMeters : opts.heightMeters;

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
