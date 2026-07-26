"use client";

import { useState, useMemo } from "react";
import type { LayoutGeometry, FixturePlacement, WallSegment, GeometryCalculations } from "@/lib/bathroom/geometry";
import { calculateGeometry } from "@/lib/bathroom/geometry";
import { validateLayout } from "@/lib/bathroom/validation";

const FIXTURE_TYPES = [
  { type: "toilet", label: "Toilet", w: 30, d: 20 },
  { type: "vanity", label: "Vanity", w: 36, d: 22 },
  { type: "sink", label: "Sink", w: 24, d: 18 },
  { type: "tub", label: "Tub", w: 60, d: 32 },
  { type: "shower", label: "Shower", w: 48, d: 36 },
  { type: "shower_enclosure", label: "Shower enclosure", w: 60, d: 36 },
  { type: "door", label: "Door", w: 32, d: 4 },
  { type: "window", label: "Window", w: 36, d: 4 },
  { type: "exhaust_fan", label: "Exhaust fan", w: 12, d: 12 },
] as const;

const COLORS: Record<string, string> = {
  toilet: "#6366f1",
  vanity: "#0ea5e9",
  sink: "#0ea5e9",
  tub: "#14b8a6",
  shower: "#14b8a6",
  shower_enclosure: "#14b8a6",
  door: "#a3a3a3",
  window: "#cbd5e1",
  exhaust_fan: "#f59e0b",
};

export type DiagramState = {
  roomLengthFt: number;
  roomWidthFt: number;
  ceilingHeightFt: number;
  fixtures: FixturePlacement[];
};

export function DiagramBuilder({
  layoutType,
  projectId,
  initialGeometry,
}: {
  layoutType: "EXISTING" | "PROPOSED";
  projectId: string;
  initialGeometry?: LayoutGeometry;
}) {
  const [lengthFt, setLengthFt] = useState(
    initialGeometry?.walls?.length ? Math.round(Math.abs(initialGeometry.walls[0].x2 - initialGeometry.walls[0].x1) / 12) : 8,
  );
  const [widthFt, setWidthFt] = useState(
    initialGeometry?.walls?.length ? Math.round(Math.abs(initialGeometry.walls[0].y2 - initialGeometry.walls[0].y1) / 12) : 5,
  );
  const [ceilingFt, setCeilingFt] = useState(initialGeometry?.ceilingHeight ? Math.round(initialGeometry.ceilingHeight / 12) : 8);
  const [fixtures, setFixtures] = useState<FixturePlacement[]>(initialGeometry?.fixtures ?? []);
  const [selected, setSelected] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const geometry: LayoutGeometry = useMemo(() => {
    const lengthIn = lengthFt * 12;
    const widthIn = widthFt * 12;
    const walls: WallSegment[] = [
      { x1: 0, y1: 0, x2: lengthIn, y2: 0 },
      { x1: lengthIn, y1: 0, x2: lengthIn, y2: widthIn },
      { x1: lengthIn, y1: widthIn, x2: 0, y2: widthIn },
      { x1: 0, y1: widthIn, x2: 0, y2: 0 },
    ];
    return { walls, fixtures, ceilingHeight: ceilingFt * 12, unit: "in" };
  }, [lengthFt, widthFt, ceilingFt, fixtures]);

  const calculations = useMemo(() => calculateGeometry(geometry), [geometry]);
  const validationIssues = useMemo(() => validateLayout(geometry), [geometry]);

  const addFixture = (type: string) => {
    const def = FIXTURE_TYPES.find((f) => f.type === type);
    if (!def) return;
    const newFixture: FixturePlacement = {
      type,
      x: Math.round((lengthFt * 12 - def.w) / 2),
      y: Math.round((widthFt * 12 - def.d) / 2),
      w: def.w,
      d: def.d,
      rotation: 0,
    };
    setFixtures((prev) => [...prev, newFixture]);
    setSelected(fixtures.length);
  };

  const updateFixture = (index: number, patch: Partial<FixturePlacement>) => {
    setFixtures((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const removeFixture = (index: number) => {
    setFixtures((prev) => prev.filter((_, i) => i !== index));
    setSelected(null);
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/bathroom-projects/${projectId}/layouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layoutType,
          name: `${layoutType.toLowerCase()} layout`,
          geometry,
          isConfirmed: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      setMsg("✓ Layout saved");
    } catch (e) {
      setMsg(`✗ ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const roomLengthIn = lengthFt * 12;
  const roomWidthIn = widthFt * 12;
  const maxDim = Math.max(roomLengthIn, roomWidthIn);
  const scale = 400 / maxDim;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <h3 className="text-lg font-semibold capitalize">{layoutType} layout</h3>
        <div className="flex gap-3 text-sm">
          <label>
            <span className="text-muted">Length (ft)</span>
            <input type="number" min="3" max="30" value={lengthFt} onChange={(e) => setLengthFt(Number(e.target.value))} className="ml-2 w-16 rounded border border-ink-15 p-1" />
          </label>
          <label>
            <span className="text-muted">Width (ft)</span>
            <input type="number" min="3" max="30" value={widthFt} onChange={(e) => setWidthFt(Number(e.target.value))} className="ml-2 w-16 rounded border border-ink-15 p-1" />
          </label>
          <label>
            <span className="text-muted">Ceiling (ft)</span>
            <input type="number" min="6" max="12" value={ceilingFt} onChange={(e) => setCeilingFt(Number(e.target.value))} className="ml-2 w-16 rounded border border-ink-15 p-1" />
          </label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_200px]">
        <div className="rounded-lg border border-ink-15 bg-bone-1 p-4">
          <svg viewBox={`0 0 ${roomLengthIn * scale + 40} ${roomWidthIn * scale + 40}`} className="w-full" style={{ maxHeight: 400 }}>
            <rect x="20" y="20" width={roomLengthIn * scale} height={roomWidthIn * scale} fill="#fafaf9" stroke="#1a1a1a" strokeWidth="2" />
            {fixtures.map((f, i) => {
              const isSel = i === selected;
              return (
                <g key={i} onClick={() => setSelected(i)} style={{ cursor: "pointer" }}>
                  <rect
                    x={20 + f.x * scale}
                    y={20 + f.y * scale}
                    width={f.w * scale}
                    height={f.d * scale}
                    fill={COLORS[f.type] ?? "#94a3b8"}
                    fillOpacity={0.5}
                    stroke={isSel ? "#dc2626" : "#475569"}
                    strokeWidth={isSel ? 2 : 1}
                  />
                  <text
                    x={20 + (f.x + f.w / 2) * scale}
                    y={20 + (f.y + f.d / 2) * scale}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#1a1a1a"
                  >
                    {f.type}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted">Add fixture</p>
          <div className="grid grid-cols-2 gap-1">
            {FIXTURE_TYPES.map((f) => (
              <button
                key={f.type}
                type="button"
                onClick={() => addFixture(f.type)}
                className="rounded border border-ink-15 p-2 text-xs text-ink-70 hover:border-ink-40"
              >
                + {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selected !== null && fixtures[selected] && (
        <div className="rounded-lg border border-ink-15 p-4">
          <p className="text-sm font-semibold">Edit: {fixtures[selected].type}</p>
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <label>
              <span className="text-muted">X (in)</span>
              <input type="number" value={fixtures[selected].x} onChange={(e) => updateFixture(selected, { x: Number(e.target.value) })} className="ml-1 w-20 rounded border border-ink-15 p-1" />
            </label>
            <label>
              <span className="text-muted">Y (in)</span>
              <input type="number" value={fixtures[selected].y} onChange={(e) => updateFixture(selected, { y: Number(e.target.value) })} className="ml-1 w-20 rounded border border-ink-15 p-1" />
            </label>
            <label>
              <span className="text-muted">W (in)</span>
              <input type="number" value={fixtures[selected].w} onChange={(e) => updateFixture(selected, { w: Number(e.target.value) })} className="ml-1 w-20 rounded border border-ink-15 p-1" />
            </label>
            <label>
              <span className="text-muted">D (in)</span>
              <input type="number" value={fixtures[selected].d} onChange={(e) => updateFixture(selected, { d: Number(e.target.value) })} className="ml-1 w-20 rounded border border-ink-15 p-1" />
            </label>
          </div>
          <button type="button" onClick={() => removeFixture(selected)} className="mt-2 text-xs text-red-700 underline">
            Remove fixture
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <p className="text-xs font-semibold uppercase text-muted">Calculated</p>
          <dl className="mt-2 grid grid-cols-2 gap-1 text-sm">
            <dt>Floor area</dt><dd>{calculations.floorAreaSqft} sq ft</dd>
            <dt>Perimeter</dt><dd>{calculations.perimeterFt} ft</dd>
            <dt>Paintable wall</dt><dd>{calculations.paintableWallAreaSqft} sq ft</dd>
            <dt>Wet wall</dt><dd>{calculations.wetWallAreaSqft} sq ft</dd>
            <dt>Tile area</dt><dd>{calculations.tileAreaSqft} sq ft</dd>
            <dt>Baseboard</dt><dd>{calculations.baseboardLengthFt} ft</dd>
            <dt>Doors</dt><dd>{calculations.doorCount}</dd>
            <dt>Windows</dt><dd>{calculations.windowCount}</dd>
          </dl>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs font-semibold uppercase text-muted">Validation</p>
          {validationIssues.length === 0 ? (
            <p className="mt-2 text-sm text-green-700">No issues detected.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {validationIssues.map((iss, i) => (
                <li key={i} className={iss.severity === "error" ? "text-red-700" : "text-amber-700"}>
                  {iss.severity === "error" ? "⛔" : "⚠"} {iss.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save layout"}
        </button>
        {msg && <span className="text-sm text-ink-70">{msg}</span>}
      </div>
    </div>
  );
}
