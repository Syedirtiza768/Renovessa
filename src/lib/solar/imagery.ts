/**
 * Satellite basemap geometry (§12).
 *
 * Renders the homeowner's actual roof under the panel overlay instead of a
 * bare schematic. The whole value depends on the panels landing exactly where
 * they belong on the photo, so the projection match is the load-bearing part
 * of this file.
 *
 * Google Static Maps serves Web Mercator tiles. At a given zoom the ground
 * resolution is:
 *
 *     metersPerPixel = 156543.03392 * cos(latitude) / 2^zoom
 *
 * Our roof geometry is already planar metres east/north of the building
 * centre (see geo.ts), so matching the two is a matter of sizing the SVG
 * viewBox to the image's exact ground footprint. Over a single building —
 * tens of metres — Web Mercator's scale distortion is far below the accuracy
 * of the underlying roof data, so a single constant resolution is correct.
 *
 * Pure functions, no I/O: unit-testable and safe to use on both sides.
 */

import type { LatLng } from "./types";

/** Earth circumference at the equator divided by 256 px, the Web Mercator base. */
export const EQUATOR_METERS_PER_PIXEL_AT_ZOOM_0 = 156543.03392;

/** Static Maps caps a single image at 640x640 logical px (1280 with scale=2). */
export const MAX_IMAGE_PX = 640;

export interface BasemapSpec {
  center: LatLng;
  zoom: number;
  /** Logical pixels requested from the provider. */
  widthPx: number;
  heightPx: number;
  /** 2 for retina; doubles delivered pixels without changing ground coverage. */
  scale: 1 | 2;
  /** Ground resolution of the delivered image, at scale=1 logical pixels. */
  metersPerPixel: number;
  /** Ground footprint of the image. */
  widthMeters: number;
  heightMeters: number;
}

export function metersPerPixel(latitude: number, zoom: number, scale: 1 | 2 = 1): number {
  return (EQUATOR_METERS_PER_PIXEL_AT_ZOOM_0 * Math.cos((latitude * Math.PI) / 180)) / (2 ** zoom * scale);
}

/**
 * Choose the tightest zoom whose image still covers the roof.
 *
 * Zoom is integral in Web Mercator, so we step down from the closest until the
 * building fits with margin. Picking too tight would crop the roof; too wide
 * makes the panels tiny.
 */
export function chooseBasemap(
  center: LatLng,
  requiredWidthMeters: number,
  requiredHeightMeters: number,
  opts: { widthPx?: number; heightPx?: number; scale?: 1 | 2; maxZoom?: number; minZoom?: number } = {},
): BasemapSpec {
  const widthPx = Math.min(opts.widthPx ?? MAX_IMAGE_PX, MAX_IMAGE_PX);
  const heightPx = Math.min(opts.heightPx ?? MAX_IMAGE_PX, MAX_IMAGE_PX);
  const scale = opts.scale ?? 2;
  const maxZoom = opts.maxZoom ?? 21;
  const minZoom = opts.minZoom ?? 16;

  for (let zoom = maxZoom; zoom > minZoom; zoom--) {
    const mpp = metersPerPixel(center.latitude, zoom);
    if (widthPx * mpp >= requiredWidthMeters && heightPx * mpp >= requiredHeightMeters) {
      return spec(center, zoom, widthPx, heightPx, scale);
    }
  }
  return spec(center, minZoom, widthPx, heightPx, scale);
}

function spec(center: LatLng, zoom: number, widthPx: number, heightPx: number, scale: 1 | 2): BasemapSpec {
  const mpp = metersPerPixel(center.latitude, zoom);
  return {
    center,
    zoom,
    widthPx,
    heightPx,
    scale,
    metersPerPixel: mpp,
    widthMeters: widthPx * mpp,
    heightMeters: heightPx * mpp,
  };
}

/**
 * The SVG viewBox that makes the basemap and the roof geometry share one
 * coordinate space.
 *
 * Planar metres are east/north of the building centre; SVG y grows downward,
 * so north maps to negative y — the same convention geo.ts already uses.
 */
export function viewBoxForBasemap(basemap: BasemapSpec): string {
  const halfW = basemap.widthMeters / 2;
  const halfH = basemap.heightMeters / 2;
  return `${-halfW} ${-halfH} ${basemap.widthMeters} ${basemap.heightMeters}`;
}

/**
 * Required attribution for Google imagery (§52).
 *
 * Static Maps burns the Google logo into the returned image, which satisfies
 * the logo requirement; this is the accompanying source line.
 */
export const GOOGLE_IMAGERY_ATTRIBUTION = "Imagery ©2026 Google, Maxar Technologies";
