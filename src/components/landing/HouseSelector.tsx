"use client";

import { useCallback, useState } from "react";
import { HOUSE_ZONES, LANDING_CATEGORIES } from "@/lib/landing-data";
import type { LandingCategoryId } from "@/lib/landing-data";
import { useCategories } from "./CategoryContext";

const ZONE_TO_CATEGORY: Record<string, LandingCategoryId> = {
  roofing: "roofing",
  solar: "roofing",
  siding: "handyman",
  windows: "windows",
  kitchen: "kitchen",
  bathroom: "bathroom",
  flooring: "flooring",
  hvac: "hvac",
  electrical: "electrical",
  plumbing: "plumbing",
};

type ZoneShape =
  | { kind: "polygon"; points: string }
  | { kind: "rect"; x: number; y: number; w: number; h: number }
  | { kind: "multi-rect"; rects: { x: number; y: number; w: number; h: number }[] };

type ZoneDef = {
  id: string;
  marker: string;
  label: string;
  markerCx: number;
  markerCy: number;
  shape: ZoneShape;
};

const ZONES: ZoneDef[] = [
  {
    id: "roofing",
    marker: "1",
    label: "Roofing",
    markerCx: 320,
    markerCy: 118,
    shape: { kind: "polygon", points: "95,193 320,42 545,193" },
  },
  {
    id: "solar",
    marker: "2",
    label: "Solar",
    markerCx: 222,
    markerCy: 140,
    shape: { kind: "polygon", points: "95,193 320,42 320,193" },
  },
  {
    id: "siding",
    marker: "3",
    label: "Siding",
    markerCx: 119,
    markerCy: 260,
    shape: {
      kind: "multi-rect",
      rects: [
        { x: 140, y: 190, w: 22, h: 140 },
        { x: 478, y: 190, w: 22, h: 140 },
      ],
    },
  },
  {
    id: "windows",
    marker: "4",
    label: "Windows & Doors",
    markerCx: 191,
    markerCy: 197,
    shape: {
      kind: "multi-rect",
      rects: [
        { x: 155, y: 210, w: 72, h: 52 },
        { x: 413, y: 210, w: 72, h: 52 },
        { x: 268, y: 255, w: 64, h: 75 },
      ],
    },
  },
  {
    id: "kitchen",
    marker: "5",
    label: "Kitchen",
    markerCx: 328,
    markerCy: 234,
    shape: { kind: "rect", x: 255, y: 190, w: 147, h: 88 },
  },
  {
    id: "bathroom",
    marker: "6",
    label: "Bathroom",
    markerCx: 197,
    markerCy: 234,
    shape: { kind: "rect", x: 140, y: 190, w: 115, h: 88 },
  },
  {
    id: "flooring",
    marker: "7",
    label: "Flooring",
    markerCx: 320,
    markerCy: 312,
    shape: { kind: "rect", x: 140, y: 295, w: 360, h: 35 },
  },
  {
    id: "hvac",
    marker: "8",
    label: "HVAC",
    markerCx: 451,
    markerCy: 234,
    shape: { kind: "rect", x: 402, y: 190, w: 98, h: 88 },
  },
  {
    id: "electrical",
    marker: "9",
    label: "Electrical",
    markerCx: 545,
    markerCy: 254,
    shape: { kind: "rect", x: 500, y: 228, w: 30, h: 52 },
  },
  {
    id: "plumbing",
    marker: "10",
    label: "Plumbing",
    markerCx: 320,
    markerCy: 286,
    shape: { kind: "rect", x: 140, y: 278, w: 360, h: 17 },
  },
];

function ZoneFill({
  shape,
  active,
  hovered,
}: {
  shape: ZoneShape;
  active: boolean;
  hovered: boolean;
}) {
  const fill = "var(--color-accent-100)";
  const fillOpacity = active ? 0.45 : hovered ? 0.25 : 0;
  const stroke = active || hovered ? "var(--color-accent)" : "none";
  const strokeWidth = active ? 2 : 1.5;

  if (shape.kind === "polygon") {
    return (
      <polygon
        points={shape.points}
        fill={fill}
        fillOpacity={fillOpacity}
        stroke={stroke}
        strokeWidth={strokeWidth}
        pointerEvents="none"
      />
    );
  }
  if (shape.kind === "rect") {
    return (
      <rect
        x={shape.x}
        y={shape.y}
        width={shape.w}
        height={shape.h}
        fill={fill}
        fillOpacity={fillOpacity}
        stroke={stroke}
        strokeWidth={strokeWidth}
        pointerEvents="none"
      />
    );
  }
  return (
    <>
      {shape.rects.map((r, i) => (
        <rect
          key={i}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          fill={fill}
          fillOpacity={fillOpacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
          pointerEvents="none"
        />
      ))}
    </>
  );
}

function HitArea({
  shape,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onKeyDown,
  label,
  active,
}: {
  shape: ZoneShape;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  label: string;
  active: boolean;
}) {
  const sharedProps = {
    fill: "transparent",
    stroke: "none",
    className: "cursor-pointer",
    role: "button" as const,
    tabIndex: 0,
    "aria-label": `${label}. ${active ? "Selected" : "Not selected"}.`,
    "aria-pressed": active,
    onClick,
    onMouseEnter,
    onMouseLeave,
    onKeyDown,
  };

  if (shape.kind === "polygon") {
    return <polygon points={shape.points} {...sharedProps} />;
  }
  if (shape.kind === "rect") {
    return <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} {...sharedProps} />;
  }
  return (
    <>
      {shape.rects.map((r, i) => (
        <rect
          key={i}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          {...sharedProps}
          aria-label={i === 0 ? sharedProps["aria-label"] : undefined}
          role={i === 0 ? "button" : undefined}
          tabIndex={i === 0 ? 0 : -1}
        />
      ))}
    </>
  );
}

export function HouseSelector() {
  const { selected, isSelected, startWizardWithTrade, openEstimate } = useCategories();

  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  const onZoneActivate = useCallback(
    (zoneId: string) => {
      const catId = ZONE_TO_CATEGORY[zoneId];
      if (!catId) return;
      startWizardWithTrade(catId);
    },
    [startWizardWithTrade],
  );

  return (
    <section id="house" className="scroll-mt-20 bg-bone-1 px-4 py-14 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-[1440px]">
        <p className="landing-eyebrow">I. Start from your home</p>
        <h2 className="landing-h2 mt-3">Pick a spot on the house — we&apos;ll open the estimate.</h2>
        <p className="mt-3 max-w-xl text-sm text-ink-70">
          Tap a zone (or a label below). We preselect that trade in the estimate wizard so you can
          get a DMV ballpark and submit an RFQ.
        </p>

        <div className="mt-8 overflow-x-auto">
          <svg
            viewBox="0 0 640 380"
            className="mx-auto w-full max-w-3xl"
            role="group"
            aria-label="Interactive house schematic"
          >
            {/* ── Layer 1: Static house outline ── */}
            <g pointerEvents="none">
              {/* Ground line */}
              <line x1="80" y1="345" x2="560" y2="345" stroke="var(--color-ink-40)" strokeWidth="1.5" />

              {/* Foundation */}
              <rect x="128" y="330" width="384" height="15" fill="var(--color-ink-15)" stroke="var(--color-ink-40)" strokeWidth="1" />

              {/* Main house body */}
              <rect x="140" y="190" width="360" height="140" fill="none" stroke="var(--color-ink-70)" strokeWidth="1.5" />

              {/* Roof triangle */}
              <polygon points="95,193 320,42 545,193" fill="none" stroke="var(--color-ink-70)" strokeWidth="1.5" />

              {/* Chimney */}
              <rect x="402" y="55" width="34" height="88" fill="var(--color-bone-1)" stroke="var(--color-ink-70)" strokeWidth="1.5" />

              {/* Interior partition — vertical left */}
              <line x1="255" y1="190" x2="255" y2="330" stroke="var(--color-ink-15)" strokeWidth="1" strokeDasharray="4,3" />

              {/* Interior partition — vertical right */}
              <line x1="402" y1="190" x2="402" y2="330" stroke="var(--color-ink-15)" strokeWidth="1" strokeDasharray="4,3" />

              {/* Interior partition — horizontal */}
              <line x1="140" y1="278" x2="500" y2="278" stroke="var(--color-ink-15)" strokeWidth="1" strokeDasharray="4,3" />

              {/* Front door */}
              <rect x="268" y="255" width="64" height="75" fill="var(--color-bone-1)" stroke="var(--color-ink-70)" strokeWidth="1.25" />
              <circle cx="322" cy="295" r="3" fill="var(--color-ink-40)" />

              {/* Left window */}
              <rect x="155" y="210" width="72" height="52" fill="var(--color-bone-1)" stroke="var(--color-ink-70)" strokeWidth="1.25" />
              <line x1="191" y1="210" x2="191" y2="262" stroke="var(--color-ink-40)" strokeWidth="0.75" />
              <line x1="155" y1="236" x2="227" y2="236" stroke="var(--color-ink-40)" strokeWidth="0.75" />

              {/* Right window */}
              <rect x="413" y="210" width="72" height="52" fill="var(--color-bone-1)" stroke="var(--color-ink-70)" strokeWidth="1.25" />
              <line x1="449" y1="210" x2="449" y2="262" stroke="var(--color-ink-40)" strokeWidth="0.75" />
              <line x1="413" y1="236" x2="485" y2="236" stroke="var(--color-ink-40)" strokeWidth="0.75" />

              {/* Electrical panel box */}
              <rect x="500" y="228" width="30" height="52" fill="var(--color-bone-1)" stroke="var(--color-ink-70)" strokeWidth="1.25" />
              <line x1="500" y1="254" x2="530" y2="254" stroke="var(--color-ink-40)" strokeWidth="0.75" />
              <line x1="515" y1="228" x2="515" y2="280" stroke="var(--color-ink-40)" strokeWidth="0.75" />
            </g>

            {/* ── Layer 2: Clickable zone fills (visual feedback, no pointer events) ── */}
            {ZONES.map((zone) => {
              const catId = ZONE_TO_CATEGORY[zone.id];
              const active = catId ? isSelected(catId) : false;
              const hovered = hoveredZone === zone.id;
              return (
                <ZoneFill key={`fill-${zone.id}`} shape={zone.shape} active={active} hovered={hovered} />
              );
            })}

            {/* ── Layer 2b: Hit areas (invisible, intercept pointer events) ── */}
            {ZONES.map((zone) => {
              const catId = ZONE_TO_CATEGORY[zone.id];
              const active = catId ? isSelected(catId) : false;
              return (
                <HitArea
                  key={`hit-${zone.id}`}
                  shape={zone.shape}
                  active={active}
                  label={zone.label}
                  onClick={() => onZoneActivate(zone.id)}
                  onMouseEnter={() => setHoveredZone(zone.id)}
                  onMouseLeave={() => setHoveredZone(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onZoneActivate(zone.id);
                    }
                  }}
                />
              );
            })}

            {/* ── Layer 3: Numbered marker circles (topmost) ── */}
            {ZONES.map((zone) => {
              const catId = ZONE_TO_CATEGORY[zone.id];
              const active = catId ? isSelected(catId) : false;
              return (
                <g key={`marker-${zone.id}`} pointerEvents="none" aria-hidden>
                  <circle
                    cx={zone.markerCx}
                    cy={zone.markerCy}
                    r={13}
                    fill={active ? "var(--color-accent)" : "var(--color-bone-0)"}
                    stroke={active ? "var(--color-accent)" : "var(--color-ink-40)"}
                    strokeWidth={1.25}
                  />
                  <text
                    x={zone.markerCx}
                    y={zone.markerCy + 4}
                    textAnchor="middle"
                    fontFamily="var(--font-mono-landing)"
                    fontSize="10"
                    fill={active ? "#fff" : "var(--color-ink-40)"}
                  >
                    {zone.marker}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {HOUSE_ZONES.map((z) => {
            const catId = ZONE_TO_CATEGORY[z.id] ?? null;
            const active = catId ? isSelected(catId) : false;
            return (
              <button
                key={z.id}
                type="button"
                onClick={() => onZoneActivate(z.id)}
                className={`flex gap-2 rounded-lg border p-2.5 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  active
                    ? "border-accent bg-accent-100"
                    : "border-ink-15 bg-white hover:border-ink-40"
                }`}
                aria-pressed={active}
              >
                <span className="font-mono-landing text-xs text-ink-40">{z.marker}</span>
                <div>
                  <p className="font-medium text-ink-100">{z.label}</p>
                  <p className="text-xs text-ink-70">{z.example}</p>
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-sm text-ink-70">
          Prefer a list?{" "}
          <button
            type="button"
            onClick={openEstimate}
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Skip to the estimate wizard
          </button>
          {" · "}
          <a href="#services" className="font-medium text-accent underline-offset-2 hover:underline">
            Browse all trades ↓
          </a>
        </p>

        {selected.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button type="button" onClick={openEstimate} className="landing-btn-primary min-h-[44px]">
              Continue estimate →
            </button>
            <p className="text-sm text-ink-70">
              {LANDING_CATEGORIES.find((c) => c.id === selected[0])?.label ?? "Trade"} selected —
              answer a few scope questions next.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
