/**
 * Manual roof mode (§37).
 *
 * The no-dead-end path when the geospatial provider has no coverage, times
 * out, returns the wrong building, or is switched off. The homeowner describes
 * their roof faces; we build a `RoofAnalysis` from those answers so every
 * downstream engine keeps working unchanged.
 *
 * Two honesty rules are enforced here:
 *   1. `isManual: true` propagates so confidence drops and the UI labels it.
 *   2. Candidate panel positions carry **no** per-panel energy figure — those
 *      would be invented. Production therefore comes from PVWatts alone, and
 *      the reconciler correctly reports SINGLE_MODEL.
 */

import type { RoofAnalysis, RoofSegment, CandidatePanel, LatLng, PanelSpecification } from "./types";
import { squareMetersToSquareFeet } from "./geo";

/**
 * A generic residential module used only when the homeowner has no provider
 * layout model to borrow a spec from. It is labelled as a planning module
 * everywhere it surfaces, and the homeowner can override the wattage.
 */
export const MANUAL_MODE_PANEL_SPEC: PanelSpecification = {
  capacityWatts: 400,
  heightMeters: 1.879,
  widthMeters: 1.045,
  source: "provider_layout_model",
  model: "Generic 400 W planning module",
};

/** Fraction of a roof face that can realistically carry modules after setbacks. */
export const MANUAL_USABLE_AREA_FRACTION = 0.7;

export interface ManualRoofFaceInput {
  /** Compass direction the face slopes toward, degrees clockwise from north. */
  azimuthDegrees: number;
  pitchDegrees: number;
  /** Homeowner's estimate of the face's area. */
  areaSquareFeet: number;
}

export interface ManualRoofInput {
  location: LatLng;
  faces: ManualRoofFaceInput[];
  /** Override the planning module wattage when the homeowner knows theirs. */
  panelCapacityWatts?: number;
}

const SQ_FT_PER_SQ_M = 10.7639;

/**
 * Build a `RoofAnalysis` from homeowner-described faces.
 *
 * Panel positions are laid out on a regular grid centred on each face so the
 * visualizer has something geometrically coherent to draw. The grid is
 * explicitly a planning sketch, not a measured layout — the UI says so.
 */
export function buildManualRoofAnalysis(input: ManualRoofInput): RoofAnalysis {
  const spec: PanelSpecification = {
    ...MANUAL_MODE_PANEL_SPEC,
    capacityWatts: input.panelCapacityWatts ?? MANUAL_MODE_PANEL_SPEC.capacityWatts,
  };
  const panelAreaM2 = spec.heightMeters * spec.widthMeters;

  const segments: RoofSegment[] = [];
  const candidatePanels: CandidatePanel[] = [];

  input.faces.forEach((face, index) => {
    const areaM2 = Math.max(0, face.areaSquareFeet) / SQ_FT_PER_SQ_M;
    const usableM2 = areaM2 * MANUAL_USABLE_AREA_FRACTION;
    const capacity = Math.max(0, Math.floor(usableM2 / panelAreaM2));

    // Lay faces out side by side around the building centre so they do not
    // overlap in the visualizer. Purely presentational — no geographic claim.
    const faceOffsetMeters = (index - (input.faces.length - 1) / 2) * 14;
    const center = offsetLatLng(input.location, faceOffsetMeters, 0);
    const halfSpan = Math.sqrt(Math.max(areaM2, 1)) / 2;

    segments.push({
      index,
      pitchDegrees: face.pitchDegrees,
      azimuthDegrees: face.azimuthDegrees,
      areaMeters2: areaM2,
      center,
      boundingBox: {
        sw: offsetLatLng(center, -halfSpan, -halfSpan),
        ne: offsetLatLng(center, halfSpan, halfSpan),
      },
      // No sunshine quantiles: we have no measurement, so we state nothing.
    });

    // Grid the face with as many modules as the usable area supports.
    const perRow = Math.max(1, Math.ceil(Math.sqrt(capacity)));
    for (let i = 0; i < capacity; i++) {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const dx = (col - (perRow - 1) / 2) * (spec.heightMeters + 0.05);
      const dy = (row - Math.floor(capacity / perRow) / 2) * (spec.widthMeters + 0.05);
      candidatePanels.push({
        id: `${index}:${i}`,
        segmentIndex: index,
        center: offsetLatLng(center, dx, dy),
        orientation: "LANDSCAPE",
        // Deliberately zero: inventing a per-panel yield here would be exactly
        // the fabrication this product forbids. PVWatts supplies production.
        yearlyEnergyDcKwh: 0,
      });
    }
  });

  const totalAreaM2 = segments.reduce((s, seg) => s + seg.areaMeters2, 0);

  return {
    providerId: "manual",
    isManual: true,
    buildingCenter: input.location,
    imageryQuality: "UNKNOWN",
    segments,
    candidatePanels,
    panelSpec: spec,
    maxPanelCount: candidatePanels.length,
    maxArrayAreaMeters2: totalAreaM2 * MANUAL_USABLE_AREA_FRACTION,
    wholeRoofAreaMeters2: totalAreaM2,
    retrievedAt: new Date().toISOString(),
  };
}

/** Offset a coordinate by metres east/north. Building-scale accuracy. */
function offsetLatLng(origin: LatLng, eastMeters: number, northMeters: number): LatLng {
  const metersPerDegLat = 111_320;
  const latRad = (origin.latitude * Math.PI) / 180;
  return {
    latitude: origin.latitude + northMeters / metersPerDegLat,
    longitude: origin.longitude + eastMeters / (metersPerDegLat * Math.cos(latRad)),
  };
}

/** Human summary of a manual roof, for the brief and the accessible description. */
export function describeManualRoof(analysis: RoofAnalysis): string {
  if (!analysis.isManual) return "";
  const faces = analysis.segments.length;
  const area = analysis.wholeRoofAreaMeters2 ?? 0;
  return `${faces} roof face${faces === 1 ? "" : "s"} totalling about ${Math.round(squareMetersToSquareFeet(area)).toLocaleString()} sq ft, as described by the homeowner. Not measured from aerial data.`;
}
