"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LayoutGeometry, FixturePlacement, WallSegment } from "@/lib/bathroom/geometry";
import { calculateGeometry, formatInchesAsFeetInches } from "@/lib/bathroom/geometry";
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
  sink: "#38bdf8",
  tub: "#14b8a6",
  shower: "#0d9488",
  shower_enclosure: "#0f766e",
  door: "#78716c",
  window: "#94a3b8",
  exhaust_fan: "#f59e0b",
};

const PAD = 28;
const GRID_IN = 6;
const SNAP_IN = 3;

type DragMode = "move" | "resize-se" | "resize-e" | "resize-s" | "rotate" | null;

type DragState = {
  mode: DragMode;
  index: number;
  startClientX: number;
  startClientY: number;
  originX: number;
  originY: number;
  originW: number;
  originD: number;
  originRotation: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function snap(n: number, step = SNAP_IN) {
  return Math.round(n / step) * step;
}

function labelFor(type: string) {
  return FIXTURE_TYPES.find((f) => f.type === type)?.label ?? type.replace(/_/g, " ");
}

function feetFromGeometry(geo?: LayoutGeometry): { lengthFt: number; widthFt: number; ceilingFt: number } {
  if (!geo?.walls?.length) return { lengthFt: 8, widthFt: 5, ceilingFt: 8 };
  const xs = geo.walls.flatMap((w) => [w.x1, w.x2]);
  const ys = geo.walls.flatMap((w) => [w.y1, w.y2]);
  const lengthFt = Math.max(3, Math.round((Math.max(...xs) - Math.min(...xs)) / 12));
  const widthFt = Math.max(3, Math.round((Math.max(...ys) - Math.min(...ys)) / 12));
  const ceilingFt = geo.ceilingHeight ? Math.round(geo.ceilingHeight / 12) : 8;
  return { lengthFt, widthFt, ceilingFt };
}

export function DiagramBuilder({
  layoutType,
  projectId,
  initialGeometry,
  compactHeader = false,
}: {
  layoutType: "EXISTING" | "PROPOSED";
  projectId: string;
  initialGeometry?: LayoutGeometry;
  /** When true, omit the big step title (parent LayoutWorkspace provides it). */
  compactHeader?: boolean;
}) {
  const initialFeet = feetFromGeometry(initialGeometry);
  const [lengthFt, setLengthFt] = useState(initialFeet.lengthFt);
  const [widthFt, setWidthFt] = useState(initialFeet.widthFt);
  const [ceilingFt, setCeilingFt] = useState(initialFeet.ceilingFt);
  const [fixtures, setFixtures] = useState<FixturePlacement[]>(initialGeometry?.fixtures ?? []);
  const [selected, setSelected] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [dragging, setDragging] = useState(false);

  const roomLengthIn = lengthFt * 12;
  const roomWidthIn = widthFt * 12;
  const maxDim = Math.max(roomLengthIn, roomWidthIn, 1);
  const scale = 420 / maxDim;
  const svgW = roomLengthIn * scale + PAD * 2;
  const svgH = roomWidthIn * scale + PAD * 2;

  const geometry: LayoutGeometry = useMemo(() => {
    const walls: WallSegment[] = [
      { x1: 0, y1: 0, x2: roomLengthIn, y2: 0 },
      { x1: roomLengthIn, y1: 0, x2: roomLengthIn, y2: roomWidthIn },
      { x1: roomLengthIn, y1: roomWidthIn, x2: 0, y2: roomWidthIn },
      { x1: 0, y1: roomWidthIn, x2: 0, y2: 0 },
    ];
    return { walls, fixtures, ceilingHeight: ceilingFt * 12, unit: "in" };
  }, [roomLengthIn, roomWidthIn, ceilingFt, fixtures]);

  const calculations = useMemo(() => calculateGeometry(geometry), [geometry]);
  const validationIssues = useMemo(() => validateLayout(geometry), [geometry]);

  const clientToInches = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const viewScaleX = svgW / rect.width;
      const viewScaleY = svgH / rect.height;
      const svgX = (clientX - rect.left) * viewScaleX;
      const svgY = (clientY - rect.top) * viewScaleY;
      return {
        x: (svgX - PAD) / scale,
        y: (svgY - PAD) / scale,
      };
    },
    [scale, svgW, svgH],
  );

  const placeFixture = useCallback(
    (type: string, atX?: number, atY?: number) => {
      const def = FIXTURE_TYPES.find((f) => f.type === type);
      if (!def) return;
      const x = snapEnabled
        ? snap(atX ?? (roomLengthIn - def.w) / 2)
        : Math.round(atX ?? (roomLengthIn - def.w) / 2);
      const y = snapEnabled
        ? snap(atY ?? (roomWidthIn - def.d) / 2)
        : Math.round(atY ?? (roomWidthIn - def.d) / 2);
      const fixture: FixturePlacement = {
        type,
        x: clamp(x, 0, Math.max(0, roomLengthIn - def.w)),
        y: clamp(y, 0, Math.max(0, roomWidthIn - def.d)),
        w: def.w,
        d: def.d,
        rotation: 0,
      };
      setFixtures((prev) => {
        setSelected(prev.length);
        return [...prev, fixture];
      });
    },
    [roomLengthIn, roomWidthIn, snapEnabled],
  );

  const updateFixture = useCallback((index: number, patch: Partial<FixturePlacement>) => {
    setFixtures((prev) =>
      prev.map((f, i) => {
        if (i !== index) return f;
        const next = { ...f, ...patch };
        next.w = Math.max(4, next.w);
        next.d = Math.max(4, next.d);
        next.x = clamp(next.x, 0, Math.max(0, roomLengthIn - next.w));
        next.y = clamp(next.y, 0, Math.max(0, roomWidthIn - next.d));
        return next;
      }),
    );
  }, [roomLengthIn, roomWidthIn]);

  const removeFixture = (index: number) => {
    setFixtures((prev) => prev.filter((_, i) => i !== index));
    setSelected(null);
  };

  const rotateSelected = (delta = 90) => {
    if (selected === null) return;
    const f = fixtures[selected];
    if (!f) return;
    const next = ((f.rotation ?? 0) + delta) % 360;
    // Swap w/d when rotating 90° so bounding box stays sensible for rectangular fixtures
    if (Math.abs(delta) % 180 === 90) {
      updateFixture(selected, { rotation: next, w: f.d, d: f.w });
    } else {
      updateFixture(selected, { rotation: next });
    }
  };

  const startDrag = (mode: Exclude<DragMode, null>, index: number, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const f = fixtures[index];
    if (!f) return;
    setSelected(index);
    dragRef.current = {
      mode,
      index,
      startClientX: e.clientX,
      startClientY: e.clientY,
      originX: f.x,
      originY: f.y,
      originW: f.w,
      originD: f.d,
      originRotation: f.rotation ?? 0,
    };
    setDragging(true);
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const viewScaleX = svgW / rect.width;
      const viewScaleY = svgH / rect.height;
      const dxIn = ((e.clientX - drag.startClientX) * viewScaleX) / scale;
      const dyIn = ((e.clientY - drag.startClientY) * viewScaleY) / scale;

      if (drag.mode === "move") {
        let x = drag.originX + dxIn;
        let y = drag.originY + dyIn;
        if (snapEnabled) {
          x = snap(x);
          y = snap(y);
        }
        updateFixture(drag.index, { x, y });
      } else if (drag.mode === "resize-se") {
        let w = drag.originW + dxIn;
        let d = drag.originD + dyIn;
        if (snapEnabled) {
          w = snap(w);
          d = snap(d);
        }
        updateFixture(drag.index, { w, d });
      } else if (drag.mode === "resize-e") {
        let w = drag.originW + dxIn;
        if (snapEnabled) w = snap(w);
        updateFixture(drag.index, { w });
      } else if (drag.mode === "resize-s") {
        let d = drag.originD + dyIn;
        if (snapEnabled) d = snap(d);
        updateFixture(drag.index, { d });
      } else if (drag.mode === "rotate") {
        const f = fixtures[drag.index];
        if (!f) return;
        const center = clientToInches(
          // approximate center in client space via SVG midpoint of fixture
          rect.left + (PAD + (f.x + f.w / 2) * scale) / viewScaleX,
          rect.top + (PAD + (f.y + f.d / 2) * scale) / viewScaleY,
        );
        // Use pointer angle relative to fixture center
        const pt = clientToInches(e.clientX, e.clientY);
        const angle = (Math.atan2(pt.y - (drag.originY + drag.originD / 2), pt.x - (drag.originX + drag.originW / 2)) * 180) / Math.PI;
        let rotation = Math.round(angle / 15) * 15;
        if (rotation < 0) rotation += 360;
        updateFixture(drag.index, { rotation });
        void center;
      }
    };

    const onUp = () => {
      dragRef.current = null;
      setDragging(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, scale, svgW, svgH, snapEnabled, updateFixture, fixtures, clientToInches]);

  // Keyboard nudging
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selected === null) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      const step = e.shiftKey ? 12 : snapEnabled ? SNAP_IN : 1;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setFixtures((prev) =>
          prev.map((f, i) => (i === selected ? { ...f, x: clamp(f.x - step, 0, Math.max(0, roomLengthIn - f.w)) } : f)),
        );
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setFixtures((prev) =>
          prev.map((f, i) => (i === selected ? { ...f, x: clamp(f.x + step, 0, Math.max(0, roomLengthIn - f.w)) } : f)),
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFixtures((prev) =>
          prev.map((f, i) => (i === selected ? { ...f, y: clamp(f.y - step, 0, Math.max(0, roomWidthIn - f.d)) } : f)),
        );
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setFixtures((prev) =>
          prev.map((f, i) => (i === selected ? { ...f, y: clamp(f.y + step, 0, Math.max(0, roomWidthIn - f.d)) } : f)),
        );
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        setFixtures((prev) => prev.filter((_, i) => i !== selected));
        setSelected(null);
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        setFixtures((prev) =>
          prev.map((f, i) => {
            if (i !== selected) return f;
            const next = ((f.rotation ?? 0) + 90) % 360;
            return { ...f, rotation: next, w: f.d, d: f.w };
          }),
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, snapEnabled, roomLengthIn, roomWidthIn]);

  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.target === svgRef.current || (e.target as Element).getAttribute("data-floor") === "1") {
      setSelected(null);
    }
  };

  const onCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("text/fixture-type");
    if (!type) return;
    const pt = clientToInches(e.clientX, e.clientY);
    const def = FIXTURE_TYPES.find((f) => f.type === type);
    placeFixture(type, pt.x - (def?.w ?? 0) / 2, pt.y - (def?.d ?? 0) / 2);
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

  const gridLines = useMemo(() => {
    if (!showGrid) return null;
    const lines: React.ReactNode[] = [];
    for (let x = 0; x <= roomLengthIn; x += GRID_IN) {
      const major = x % 12 === 0;
      lines.push(
        <line
          key={`vx-${x}`}
          x1={PAD + x * scale}
          y1={PAD}
          x2={PAD + x * scale}
          y2={PAD + roomWidthIn * scale}
          stroke={major ? "#d6d3d1" : "#e7e5e4"}
          strokeWidth={major ? 1 : 0.5}
        />,
      );
    }
    for (let y = 0; y <= roomWidthIn; y += GRID_IN) {
      const major = y % 12 === 0;
      lines.push(
        <line
          key={`hy-${y}`}
          x1={PAD}
          y1={PAD + y * scale}
          x2={PAD + roomLengthIn * scale}
          y2={PAD + y * scale}
          stroke={major ? "#d6d3d1" : "#e7e5e4"}
          strokeWidth={major ? 1 : 0.5}
        />,
      );
    }
    return lines;
  }, [showGrid, roomLengthIn, roomWidthIn, scale]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {!compactHeader && (
            <>
              <h3 className="text-lg font-semibold capitalize">{layoutType.toLowerCase()} layout</h3>
              <p className="mt-1 text-sm text-ink-70">
                Drag fixtures onto the floor plan. Drag to move, use corner handles to resize, R to rotate, arrows to nudge.
              </p>
            </>
          )}
          {compactHeader && (
            <p className="text-sm text-ink-70">
              Editing {layoutType.toLowerCase()} — drag to move, handles to resize, R to rotate.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <label>
            <span className="text-muted">Length (ft)</span>
            <input type="number" min="3" max="30" step="0.5" value={lengthFt} onChange={(e) => setLengthFt(Number(e.target.value))} className="ml-2 w-16 rounded border border-ink-15 p-1" />
          </label>
          <label>
            <span className="text-muted">Width (ft)</span>
            <input type="number" min="3" max="30" step="0.5" value={widthFt} onChange={(e) => setWidthFt(Number(e.target.value))} className="ml-2 w-16 rounded border border-ink-15 p-1" />
          </label>
          <label>
            <span className="text-muted">Ceiling (ft)</span>
            <input type="number" min="6" max="12" step="0.5" value={ceilingFt} onChange={(e) => setCeilingFt(Number(e.target.value))} className="ml-2 w-16 rounded border border-ink-15 p-1" />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <label className="flex items-center gap-2 rounded-full border border-ink-15 px-3 py-1">
          <input type="checkbox" checked={snapEnabled} onChange={(e) => setSnapEnabled(e.target.checked)} />
          Snap to {SNAP_IN}&quot; grid
        </label>
        <label className="flex items-center gap-2 rounded-full border border-ink-15 px-3 py-1">
          <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
          Show grid
        </label>
        {selected !== null && (
          <>
            <button type="button" onClick={() => rotateSelected(90)} className="rounded-full border border-ink-15 px-3 py-1 hover:border-ink-40">
              Rotate 90°
            </button>
            <button type="button" onClick={() => removeFixture(selected)} className="rounded-full border border-red-200 px-3 py-1 text-red-700 hover:bg-red-50">
              Delete
            </button>
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <div
          className="overflow-auto rounded-xl border border-ink-15 bg-[#f5f5f4] p-3 touch-none"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onCanvasDrop}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="mx-auto w-full select-none"
            style={{ maxHeight: 520, cursor: dragging ? "grabbing" : "default" }}
            onPointerDown={onCanvasPointerDown}
          >
            {/* Floor */}
            <rect
              data-floor="1"
              x={PAD}
              y={PAD}
              width={roomLengthIn * scale}
              height={roomWidthIn * scale}
              fill="#fafaf9"
              stroke="#1c1917"
              strokeWidth="2.5"
              rx="2"
            />
            {gridLines}

            {/* Dimension labels */}
            <text x={PAD + (roomLengthIn * scale) / 2} y={PAD - 8} textAnchor="middle" fontSize="11" fill="#78716c">
              {lengthFt}&apos; length
            </text>
            <text
              x={PAD - 10}
              y={PAD + (roomWidthIn * scale) / 2}
              textAnchor="middle"
              fontSize="11"
              fill="#78716c"
              transform={`rotate(-90 ${PAD - 10} ${PAD + (roomWidthIn * scale) / 2})`}
            >
              {widthFt}&apos; width
            </text>

            {/* Fixtures */}
            {fixtures.map((f, i) => {
              const isSel = i === selected;
              const color = COLORS[f.type] ?? "#94a3b8";
              const cx = PAD + (f.x + f.w / 2) * scale;
              const cy = PAD + (f.y + f.d / 2) * scale;
              const rot = f.rotation ?? 0;
              return (
                <g
                  key={i}
                  transform={`rotate(${rot} ${cx} ${cy})`}
                  onPointerDown={(e) => startDrag("move", i, e)}
                  style={{ cursor: dragging && selected === i ? "grabbing" : "grab" }}
                >
                  <rect
                    x={PAD + f.x * scale}
                    y={PAD + f.y * scale}
                    width={f.w * scale}
                    height={f.d * scale}
                    fill={color}
                    fillOpacity={isSel ? 0.7 : 0.45}
                    stroke={isSel ? "#dc2626" : "#44403c"}
                    strokeWidth={isSel ? 2.5 : 1.25}
                    rx={3}
                  />
                  {/* Fixture orientation mark */}
                  <line
                    x1={PAD + f.x * scale + 4}
                    y1={PAD + f.y * scale + 4}
                    x2={PAD + f.x * scale + Math.min(14, f.w * scale - 4)}
                    y2={PAD + f.y * scale + 4}
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <text
                    x={cx}
                    y={cy + 4}
                    textAnchor="middle"
                    fontSize={Math.max(9, Math.min(12, f.w * scale * 0.28))}
                    fill="#1c1917"
                    fontWeight="600"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {labelFor(f.type)}
                  </text>

                  {isSel && (
                    <>
                      {/* Resize handles */}
                      <circle
                        cx={PAD + (f.x + f.w) * scale}
                        cy={PAD + (f.y + f.d) * scale}
                        r={6}
                        fill="#fff"
                        stroke="#dc2626"
                        strokeWidth="2"
                        style={{ cursor: "nwse-resize" }}
                        onPointerDown={(e) => startDrag("resize-se", i, e)}
                      />
                      <circle
                        cx={PAD + (f.x + f.w) * scale}
                        cy={PAD + (f.y + f.d / 2) * scale}
                        r={5}
                        fill="#fff"
                        stroke="#dc2626"
                        strokeWidth="2"
                        style={{ cursor: "ew-resize" }}
                        onPointerDown={(e) => startDrag("resize-e", i, e)}
                      />
                      <circle
                        cx={PAD + (f.x + f.w / 2) * scale}
                        cy={PAD + (f.y + f.d) * scale}
                        r={5}
                        fill="#fff"
                        stroke="#dc2626"
                        strokeWidth="2"
                        style={{ cursor: "ns-resize" }}
                        onPointerDown={(e) => startDrag("resize-s", i, e)}
                      />
                      {/* Rotate handle */}
                      <line
                        x1={cx}
                        y1={PAD + f.y * scale}
                        x2={cx}
                        y2={PAD + f.y * scale - 18}
                        stroke="#dc2626"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx={cx}
                        cy={PAD + f.y * scale - 18}
                        r={6}
                        fill="#fff"
                        stroke="#dc2626"
                        strokeWidth="2"
                        style={{ cursor: "grab" }}
                        onPointerDown={(e) => startDrag("rotate", i, e)}
                      />
                    </>
                  )}
                </g>
              );
            })}
          </svg>
          {fixtures.length === 0 && (
            <p className="mt-2 text-center text-sm text-ink-40">
              Drag a fixture from the palette onto the room, or tap + to place one in the center.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Fixture palette</p>
          <p className="text-xs text-ink-40">Drag onto the canvas or tap to add.</p>
          <div className="grid grid-cols-1 gap-1.5">
            {FIXTURE_TYPES.map((f) => (
              <button
                key={f.type}
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/fixture-type", f.type);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => placeFixture(f.type)}
                className="flex items-center gap-2 rounded-lg border border-ink-15 bg-white p-2.5 text-left text-sm transition hover:border-ink-40 hover:shadow-sm active:scale-[0.98]"
              >
                <span
                  className="inline-block h-4 w-4 shrink-0 rounded"
                  style={{ background: COLORS[f.type] }}
                />
                <span className="font-medium text-ink-100">{f.label}</span>
                <span className="ml-auto text-xs text-ink-40">
                  {f.w}&quot;×{f.d}&quot;
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {selected !== null && fixtures[selected] && (
        <div className="rounded-xl border border-ink-15 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              Selected: {labelFor(fixtures[selected].type)}
              <span className="ml-2 font-normal text-ink-40">
                {formatInchesAsFeetInches(fixtures[selected].w)} × {formatInchesAsFeetInches(fixtures[selected].d)}
                {fixtures[selected].rotation ? ` · ${fixtures[selected].rotation}°` : ""}
              </span>
            </p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
            {(["x", "y", "w", "d"] as const).map((key) => (
              <label key={key}>
                <span className="text-muted uppercase">{key === "d" ? "Depth" : key} (in)</span>
                <input
                  type="number"
                  value={Math.round(fixtures[selected][key])}
                  onChange={(e) => updateFixture(selected, { [key]: Number(e.target.value) })}
                  className="mt-1 w-full rounded border border-ink-15 p-2"
                />
              </label>
            ))}
            <label>
              <span className="text-muted">Rotation °</span>
              <input
                type="number"
                step={15}
                value={fixtures[selected].rotation ?? 0}
                onChange={(e) => updateFixture(selected, { rotation: Number(e.target.value) })}
                className="mt-1 w-full rounded border border-ink-15 p-2"
              />
            </label>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-4">
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
        <div className="rounded-xl border p-4">
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
