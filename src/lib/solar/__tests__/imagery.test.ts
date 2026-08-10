/**
 * Basemap projection and PVGIS azimuth conversion.
 *
 * Both are silent-corruption risks: a wrong metres-per-pixel puts the panels
 * off the roof, and a wrong azimuth conversion models a south roof as facing
 * north while still returning a plausible-looking number.
 */

import { describe, it, expect } from "vitest";
import {
  metersPerPixel,
  chooseBasemap,
  viewBoxForBasemap,
  EQUATOR_METERS_PER_PIXEL_AT_ZOOM_0,
  MAX_IMAGE_PX,
} from "../imagery";
import { toPvgisAspect } from "../providers/pvgis";

describe("web mercator ground resolution", () => {
  it("matches the known equator value at zoom 0", () => {
    expect(metersPerPixel(0, 0)).toBeCloseTo(EQUATOR_METERS_PER_PIXEL_AT_ZOOM_0, 5);
  });

  it("halves with each zoom level", () => {
    const z18 = metersPerPixel(39.08, 18);
    const z19 = metersPerPixel(39.08, 19);
    expect(z19).toBeCloseTo(z18 / 2, 9);
  });

  it("shrinks with latitude by cos(lat)", () => {
    const equator = metersPerPixel(0, 20);
    const dmv = metersPerPixel(39.08, 20);
    expect(dmv).toBeCloseTo(equator * Math.cos((39.08 * Math.PI) / 180), 9);
  });

  it("scale=2 delivers twice the pixels for the same ground footprint", () => {
    expect(metersPerPixel(39.08, 20, 2)).toBeCloseTo(metersPerPixel(39.08, 20, 1) / 2, 9);
  });
});

describe("basemap selection", () => {
  const center = { latitude: 39.0818, longitude: -77.1517 };

  it("always covers the requested footprint", () => {
    for (const size of [15, 30, 60, 120, 240]) {
      const b = chooseBasemap(center, size, size);
      expect(b.widthMeters).toBeGreaterThanOrEqual(size);
      expect(b.heightMeters).toBeGreaterThanOrEqual(size);
    }
  });

  it("picks a tighter zoom for a smaller roof", () => {
    const small = chooseBasemap(center, 20, 20);
    const large = chooseBasemap(center, 200, 200);
    expect(small.zoom).toBeGreaterThan(large.zoom);
  });

  it("never exceeds the provider's image size limit", () => {
    const b = chooseBasemap(center, 50, 50, { widthPx: 5000, heightPx: 5000 });
    expect(b.widthPx).toBeLessThanOrEqual(MAX_IMAGE_PX);
    expect(b.heightPx).toBeLessThanOrEqual(MAX_IMAGE_PX);
  });

  it("clamps to the minimum zoom rather than failing on an enormous request", () => {
    const b = chooseBasemap(center, 100_000, 100_000, { minZoom: 16 });
    expect(b.zoom).toBe(16);
  });

  it("produces a viewBox centred on the building, north-up", () => {
    const b = chooseBasemap(center, 40, 40);
    const [x, y, w, h] = viewBoxForBasemap(b).split(" ").map(Number);
    // Centred: the origin (building centre) sits exactly in the middle.
    expect(x).toBeCloseTo(-w / 2, 9);
    expect(y).toBeCloseTo(-h / 2, 9);
    expect(w).toBeCloseTo(b.widthMeters, 9);
    expect(h).toBeCloseTo(b.heightMeters, 9);
  });
});

describe("PVGIS azimuth conversion", () => {
  // Google/PVWatts: 0 = north, 180 = south. PVGIS: 0 = south, -90 = east.
  it("maps the cardinal directions correctly", () => {
    expect(toPvgisAspect(180)).toBe(0); // south
    expect(toPvgisAspect(90)).toBe(-90); // east
    expect(toPvgisAspect(270)).toBe(90); // west
    expect(toPvgisAspect(0)).toBe(180); // north
  });

  it("stays within (-180, 180]", () => {
    for (let a = 0; a < 360; a += 7) {
      const v = toPvgisAspect(a);
      expect(v).toBeGreaterThan(-180.001);
      expect(v).toBeLessThanOrEqual(180);
    }
  });

  it("handles out-of-range input the same as its normalised equivalent", () => {
    expect(toPvgisAspect(540)).toBe(toPvgisAspect(180));
    expect(toPvgisAspect(225)).toBe(45); // south-west
  });
});
