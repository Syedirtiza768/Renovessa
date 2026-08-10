"use client";

/**
 * Roof visualizer.
 *
 * Renders the *actual* roof geometry the estimate is computed from: provider
 * roof-segment bounding boxes and provider candidate-panel centres, projected
 * into a local planar frame. Segment shading comes from each plane's real
 * annual sunshine hours — not a decorative gradient.
 *
 * Deliberately geometric rather than photographic in Phase 1. See
 * docs/planning/SOLAR_IMPLEMENTATION_NOTE.md §I-1 for the reasoning and the
 * Phase 2 imagery plan. The `basemap` slot exists for that upgrade.
 *
 * Accessibility (§55): the SVG is decorative-with-labels; every number it
 * conveys is also rendered in the textual roof description that sits beside
 * it, and panels are togglable from a keyboard list, not only by clicking the
 * canvas. A homeowner who cannot use the map can still complete the flow.
 */

import { useMemo, useState, type ReactNode } from "react";
import type { RoofAnalysis, CandidatePanel, RoofSegment } from "@/lib/solar/types";
import { chooseBasemap, GOOGLE_IMAGERY_ATTRIBUTION } from "@/lib/solar/imagery";
import {
  toPlanar,
  boundingBoxCorners,
  panelCorners,
  toSvgPoints,
  extentOf,
  padExtent,
  viewBoxFor,
  compassLabel,
  squareMetersToSquareFeet,
  type PlanarPoint,
} from "@/lib/solar/geo";
import { formatSquareFeet, formatDegrees, formatMonthYear } from "@/lib/solar/formatters";

export type RoofLayer = "segments" | "sunlight" | "panels";

interface RoofVisualizerProps {
  analysis: RoofAnalysis;
  selectedPanelIds: Set<string>;
  excludedSegments: Set<number>;
  onTogglePanel?: (panelId: string) => void;
  onToggleSegment?: (segmentIndex: number) => void;
  /** Show the real aerial photo beneath the panels. Falls back silently. */
  imageryEnabled?: boolean;
  /** Escape hatch for a custom basemap node (tests, future providers). */
  basemap?: ReactNode;
}

/** Sunlight colour ramp. Uses the site palette rather than a rainbow scale. */
function sunlightFill(segment: RoofSegment, minHours: number, maxHours: number): string {
  const median = segment.medianSunshineHours;
  if (median === undefined || maxHours <= minHours) return "#d8d4ca";
  const t = Math.max(0, Math.min(1, (median - minHours) / (maxHours - minHours)));
  // Cool bone → warm accent. Perceptually monotonic in lightness so it is
  // still readable in greyscale, and never colour-alone (labels carry values).
  const from = [216, 212, 202];
  const to = [193, 122, 42];
  const rgb = from.map((c, i) => Math.round(c + (to[i] - c) * t));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

export function RoofVisualizer({
  analysis,
  selectedPanelIds,
  excludedSegments,
  onTogglePanel,
  onToggleSegment,
  imageryEnabled = false,
  basemap,
}: RoofVisualizerProps) {
  const [layer, setLayer] = useState<RoofLayer>("panels");
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [imageryFailed, setImageryFailed] = useState(false);
  const [showImagery, setShowImagery] = useState(true);

  const origin = analysis.buildingCenter;

  const geometry = useMemo(() => {
    const segmentShapes = analysis.segments.map((s) => ({
      segment: s,
      corners: boundingBoxCorners(s.boundingBox, origin),
    }));

    const panelShapes = analysis.candidatePanels.map((p) => {
      const segment = analysis.segments.find((s) => s.index === p.segmentIndex);
      return {
        panel: p,
        corners: panelCorners({
          center: p.center,
          origin,
          widthMeters: analysis.panelSpec.widthMeters,
          heightMeters: analysis.panelSpec.heightMeters,
          orientation: p.orientation,
          azimuthDegrees: segment?.azimuthDegrees ?? 180,
          // Without the plane's pitch the panel is drawn at full length and
          // overhangs the roof edge in this overhead view.
          pitchDegrees: segment?.pitchDegrees ?? 0,
        }),
      };
    });

    const allPoints: PlanarPoint[] = [
      ...segmentShapes.flatMap((s) => s.corners),
      ...panelShapes.flatMap((p) => p.corners),
    ];
    const extent = extentOf(allPoints.length ? allPoints : [toPlanar(origin, origin)]);
    const padded = padExtent(extent ?? { minX: -10, maxX: 10, minY: -10, maxY: 10 }, 3);
    const box = viewBoxFor(padded);

    // Size the aerial image to cover the roof, then place it in the SAME
    // planar-metre space as the geometry. Because both use metres east/north
    // of the building centre, the panels land exactly where they belong on the
    // photo — no separate registration step, nothing to drift out of sync.
    const basemapSpec = chooseBasemap(origin, box.width, box.height);

    return { segmentShapes, panelShapes, basemapSpec, ...box };
  }, [analysis, origin]);

  const basemapUrl = useMemo(() => {
    if (!imageryEnabled) return null;
    // Send the chosen zoom, not the footprint it implies: the server must not
    // re-derive it, or a rounded metre value can push it to a different zoom
    // and the photo will no longer line up with the panels.
    return `/api/solar/basemap?lat=${origin.latitude}&lng=${origin.longitude}&z=${geometry.basemapSpec.zoom}`;
  }, [imageryEnabled, geometry.basemapSpec.zoom, origin]);

  const imageryVisible = Boolean(basemapUrl) && showImagery && !imageryFailed;

  const sunshineRange = useMemo(() => {
    const values = analysis.segments
      .map((s) => s.medianSunshineHours)
      .filter((v): v is number => typeof v === "number");
    return values.length ? { min: Math.min(...values), max: Math.max(...values) } : { min: 0, max: 0 };
  }, [analysis.segments]);

  const hasSunlightData = sunshineRange.max > sunshineRange.min;
  const imageryLabel = formatMonthYear(analysis.imageryDate);

  return (
    <figure className="m-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-15 px-4 py-3">
        <div
          className="flex rounded-full border border-ink-15 text-xs"
          role="group"
          aria-label="Roof view layers"
        >
          {(
            [
              { id: "segments", label: "Roof faces" },
              { id: "sunlight", label: "Sunlight" },
              { id: "panels", label: "Panels" },
            ] as Array<{ id: RoofLayer; label: string }>
          ).map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLayer(l.id)}
              aria-pressed={layer === l.id}
              disabled={l.id === "sunlight" && !hasSunlightData}
              className={`rounded-full px-3 py-1 transition disabled:opacity-40 ${
                layer === l.id ? "bg-accent text-bone-0" : "text-ink-70 hover:text-ink-100"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs text-ink-40">
          {basemapUrl && !imageryFailed && (
            <button
              type="button"
              onClick={() => setShowImagery((v) => !v)}
              aria-pressed={showImagery}
              className="rounded-full border border-ink-15 px-3 py-1 transition hover:text-ink-100"
            >
              {showImagery ? "Hide photo" : "Show photo"}
            </button>
          )}
          <span aria-hidden className="font-mono-landing">
            ↑ N
          </span>
          {analysis.isManual ? (
            <span>Roof described by you</span>
          ) : (
            <span>
              Imagery {imageryLabel ?? "date not reported"}
              {analysis.imageryQuality !== "UNKNOWN" && ` · ${analysis.imageryQuality.toLowerCase()} quality`}
            </span>
          )}
        </div>
      </div>

      <div className="relative bg-bone-1">
        {basemap}
        <svg
          viewBox={geometry.viewBox}
          className="block h-[clamp(260px,48vh,540px)] w-full"
          role="img"
          aria-label={roofAltText(analysis)}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* The real roof, in the same planar-metre space as the geometry. */}
          {imageryVisible && basemapUrl && (
            <image
              href={basemapUrl}
              x={-geometry.basemapSpec.widthMeters / 2}
              y={-geometry.basemapSpec.heightMeters / 2}
              width={geometry.basemapSpec.widthMeters}
              height={geometry.basemapSpec.heightMeters}
              preserveAspectRatio="none"
              onError={() => setImageryFailed(true)}
            />
          )}

          {/* Roof planes.
              The provider gives an axis-aligned lat/lng bounding box, not the
              plane's true outline, so over a real photo these rectangles can
              never line up with a diagonal ridge. They are drawn only when
              they carry information the photo doesn't — the sunlight ramp, an
              excluded face, or the one being hovered. */}
          {geometry.segmentShapes.map(({ segment, corners }) => {
            const excluded = excludedSegments.has(segment.index);
            const sunlightLayer = layer === "sunlight" && hasSunlightData;
            const hovered = hoveredSegment === segment.index;
            // Over the photo the box is muted to nothing unless it is carrying
            // information the image cannot: the sunlight ramp, an excluded
            // face, or the one under the cursor. It stays in the DOM either
            // way so it remains hoverable and clickable.
            const muted = imageryVisible && !sunlightLayer && !excluded && !hovered;
            const fill = sunlightLayer ? sunlightFill(segment, sunshineRange.min, sunshineRange.max) : "#efebe2";
            const fillOpacity = muted
              ? 0
              : imageryVisible
                ? excluded
                  ? 0.12
                  : sunlightLayer
                    ? 0.55
                    : 0
                : excluded
                  ? 0.3
                  : 1;
            return (
              <polygon
                key={`seg-${segment.index}`}
                points={toSvgPoints(corners)}
                fill={fill}
                fillOpacity={fillOpacity}
                stroke={hovered ? "#c17a2a" : imageryVisible ? "#ffffff" : "#8a8a8a"}
                strokeWidth={hovered ? 0.35 : imageryVisible ? 0.1 : 0.15}
                strokeOpacity={muted ? 0 : imageryVisible && !hovered ? 0.5 : 1}
                // Keep the invisible box interactive so roof faces stay
                // selectable directly on the photo.
                pointerEvents="all"
                strokeDasharray={excluded ? "0.6 0.4" : undefined}
                onMouseEnter={() => setHoveredSegment(segment.index)}
                onMouseLeave={() => setHoveredSegment(null)}
                onClick={() => onToggleSegment?.(segment.index)}
                style={{ cursor: onToggleSegment ? "pointer" : "default" }}
              />
            );
          })}

          {/* Candidate panels */}
          {layer === "panels" &&
            geometry.panelShapes.map(({ panel, corners }) => {
              const selected = selectedPanelIds.has(panel.id);
              const excluded = excludedSegments.has(panel.segmentIndex);
              if (excluded && !selected) return null;
              return (
                <polygon
                  key={panel.id}
                  points={toSvgPoints(corners)}
                  fill={selected ? "#1a1a1a" : "#ffffff"}
                  fillOpacity={selected ? 0.88 : 0.35}
                  stroke={selected ? "#c17a2a" : "#8a8a8a"}
                  strokeWidth={selected ? 0.08 : 0.04}
                  onClick={() => onTogglePanel?.(panel.id)}
                  style={{ cursor: onTogglePanel ? "pointer" : "default" }}
                >
                  <title>
                    {`Panel on roof face ${panel.segmentIndex + 1}${
                      panel.yearlyEnergyDcKwh > 0
                        ? ` — about ${Math.round(panel.yearlyEnergyDcKwh)} kWh DC per year`
                        : ""
                    }. ${selected ? "Selected" : "Not selected"}.`}
                  </title>
                </polygon>
              );
            })}
        </svg>
      </div>

      {layer === "sunlight" && hasSunlightData && (
        <div className="flex items-center gap-3 border-t border-ink-15 px-4 py-2 text-xs text-ink-70">
          <span>{Math.round(sunshineRange.min).toLocaleString()} h</span>
          <span
            aria-hidden
            className="h-2 flex-1 rounded-full"
            style={{ background: "linear-gradient(to right, rgb(216,212,202), rgb(193,122,42))" }}
          />
          <span>{Math.round(sunshineRange.max).toLocaleString()} h</span>
          <span className="text-ink-40">median annual sunlight per roof face</span>
        </div>
      )}

      <figcaption className="border-t border-ink-15 px-4 py-3 text-xs leading-relaxed text-ink-40">
        {/* Licence requires the source line alongside the imagery (§52). */}
        {imageryVisible && <span className="mr-1 text-ink-70">{GOOGLE_IMAGERY_ATTRIBUTION}.</span>}
        Conceptual solar layout drawn from{" "}
        {analysis.isManual ? "the roof faces you described" : "aerial roof analysis"}. Final panel placement,
        setbacks, access pathways, structural requirements and code compliance must be verified by your installer
        and the local authority having jurisdiction.
      </figcaption>
    </figure>
  );
}

/**
 * The non-map textual equivalent (§55). Rendered alongside the canvas, not
 * hidden behind it — it carries the same numbers, so a homeowner who cannot
 * interact with the map has the same information.
 */
export function RoofDescription({
  analysis,
  selectedPanelIds,
  excludedSegments,
  onToggleSegment,
}: {
  analysis: RoofAnalysis;
  selectedPanelIds: Set<string>;
  excludedSegments: Set<number>;
  onToggleSegment?: (segmentIndex: number) => void;
}) {
  if (!analysis.segments.length) {
    return (
      <p className="text-sm text-ink-70">
        No individual roof faces were resolved for this property.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <caption className="sr-only">
          Roof faces, their orientation, pitch, area, sunlight and the panels selected on each
        </caption>
        <thead>
          <tr className="border-b border-ink-15 text-left text-xs uppercase tracking-wide text-ink-40">
            <th scope="col" className="py-2 pr-3 font-medium">Roof face</th>
            <th scope="col" className="py-2 pr-3 font-medium">Faces</th>
            <th scope="col" className="py-2 pr-3 font-medium">Pitch</th>
            <th scope="col" className="py-2 pr-3 font-medium">Area</th>
            <th scope="col" className="py-2 pr-3 font-medium">Annual sun</th>
            <th scope="col" className="py-2 pr-3 font-medium">Panels</th>
            {onToggleSegment && <th scope="col" className="py-2 font-medium">Include</th>}
          </tr>
        </thead>
        <tbody>
          {analysis.segments.map((s) => {
            const selectedHere = analysis.candidatePanels.filter(
              (p) => p.segmentIndex === s.index && selectedPanelIds.has(p.id),
            ).length;
            const availableHere = analysis.candidatePanels.filter((p) => p.segmentIndex === s.index).length;
            const excluded = excludedSegments.has(s.index);
            return (
              <tr key={s.index} className="border-b border-ink-15/60 text-ink-70">
                <th scope="row" className="py-2 pr-3 font-medium text-ink-100">
                  Face {s.index + 1}
                </th>
                <td className="py-2 pr-3">{compassLabel(s.azimuthDegrees)}</td>
                <td className="py-2 pr-3">{formatDegrees(s.pitchDegrees)}</td>
                <td className="py-2 pr-3">{formatSquareFeet(squareMetersToSquareFeet(s.areaMeters2))}</td>
                <td className="py-2 pr-3">
                  {s.medianSunshineHours ? `${Math.round(s.medianSunshineHours).toLocaleString()} h` : "—"}
                </td>
                <td className="py-2 pr-3">
                  {selectedHere} of {availableHere}
                </td>
                {onToggleSegment && (
                  <td className="py-2">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!excluded}
                        onChange={() => onToggleSegment(s.index)}
                        className="h-4 w-4 accent-[#c17a2a]"
                      />
                      <span className="sr-only">Include roof face {s.index + 1} in the layout</span>
                    </label>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function roofAltText(analysis: RoofAnalysis): string {
  const faces = analysis.segments.length;
  const panels = analysis.candidatePanels.length;
  const dirs = [...new Set(analysis.segments.map((s) => compassLabel(s.azimuthDegrees)))].join(", ");
  return `Plan view of the roof showing ${faces} roof face${faces === 1 ? "" : "s"} facing ${dirs || "unknown directions"}, with ${panels} candidate panel position${panels === 1 ? "" : "s"}. The same information is given in the roof faces table below.`;
}

/** Selected-panel ids helper shared by the planner and the results view. */
export function panelsBySegment(panels: CandidatePanel[]): Map<number, CandidatePanel[]> {
  const map = new Map<number, CandidatePanel[]>();
  for (const p of panels) {
    const list = map.get(p.segmentIndex) ?? [];
    list.push(p);
    map.set(p.segmentIndex, list);
  }
  return map;
}
