"use client";

import { useEffect, useMemo, useState } from "react";
import type { LayoutGeometry } from "@/lib/bathroom/geometry";
import {
  buildExistingTemplate,
  buildProposedFromExisting,
  needsProposedLayout,
  resolveRoomFeet,
} from "@/lib/bathroom/layout-templates";
import type { PlannerAnswers } from "./planner-types";
import { DiagramBuilder } from "./DiagramBuilder";

type LayoutTab = "EXISTING" | "PROPOSED";

export function LayoutWorkspace({
  projectId,
  answers,
  setAnswer,
}: {
  projectId: string;
  answers: PlannerAnswers;
  setAnswer: (key: string, value: string) => void;
}) {
  const showProposed = needsProposedLayout(answers) || answers.forceProposedLayout === "yes";
  const [tab, setTab] = useState<LayoutTab>("EXISTING");
  const [existingGeo, setExistingGeo] = useState<LayoutGeometry | null>(null);
  const [proposedGeo, setProposedGeo] = useState<LayoutGeometry | null>(null);
  const [existingKey, setExistingKey] = useState(0);
  const [proposedKey, setProposedKey] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const feet = useMemo(() => resolveRoomFeet(answers), [answers]);

  // Load saved layouts once; bootstrap template if none
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/bathroom-projects/${projectId}/layouts`);
        if (!res.ok) {
          if (!cancelled) {
            const geo = buildExistingTemplate(answers);
            setExistingGeo(geo);
            setExistingKey((k) => k + 1);
            if (needsProposedLayout(answers)) {
              setProposedGeo(buildProposedFromExisting(geo, answers));
              setProposedKey((k) => k + 1);
            }
            setNote("Started from a room template — adjust fixtures to match, then save.");
          }
          return;
        }
        const rows = (await res.json()) as Array<{
          layoutType: string;
          geometryJson: LayoutGeometry;
          createdAt: string;
        }>;
        if (cancelled) return;
        const existing = rows.find((r) => r.layoutType === "EXISTING");
        const proposed = rows.find((r) => r.layoutType === "PROPOSED");
        if (existing?.geometryJson) {
          setExistingGeo(existing.geometryJson);
          setExistingKey((k) => k + 1);
        } else {
          const geo = buildExistingTemplate(answers);
          setExistingGeo(geo);
          setExistingKey((k) => k + 1);
          setNote("Started from a room template — adjust fixtures to match, then save.");
        }
        if (proposed?.geometryJson) {
          setProposedGeo(proposed.geometryJson);
          setProposedKey((k) => k + 1);
        } else if (needsProposedLayout(answers)) {
          const base = existing?.geometryJson ?? buildExistingTemplate(answers);
          setProposedGeo(buildProposedFromExisting(base, answers));
          setProposedKey((k) => k + 1);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally once per project — answers drive Generate / Reset buttons instead
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!showProposed && tab === "PROPOSED") setTab("EXISTING");
  }, [showProposed, tab]);

  const applyExistingTemplate = () => {
    const geo = buildExistingTemplate(answers);
    setExistingGeo(geo);
    setExistingKey((k) => k + 1);
    setAnswer("length", String(feet.lengthFt));
    setAnswer("width", String(feet.widthFt));
    setAnswer("ceilingHeight", String(feet.ceilingFt));
    setAnswer("has_diagram", "yes");
    setNote("Template applied — drag fixtures to match your room, then save.");
    setTab("EXISTING");
  };

  const generateProposed = () => {
    const base = existingGeo ?? buildExistingTemplate(answers);
    if (!existingGeo) {
      setExistingGeo(base);
      setExistingKey((k) => k + 1);
    }
    const proposed = buildProposedFromExisting(base, answers);
    setProposedGeo(proposed);
    setProposedKey((k) => k + 1);
    setAnswer("forceProposedLayout", "yes");
    setAnswer("has_diagram", "yes");
    setNote("Proposed layout generated from your goals — review and adjust.");
    setTab("PROPOSED");
  };

  if (loading) {
    return <p className="text-sm text-ink-70">Loading layout…</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-ink-100">Room layout</h2>
        <p className="mt-1 text-sm text-ink-70">
          Start from a template, then drag to match your space.
          {showProposed
            ? " Toggle Proposed to review the remodel plan."
            : " Generate a proposed layout if you are changing the wet wall or footprint."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTab("EXISTING")}
          className={`rounded-full border px-4 py-1.5 text-sm transition ${
            tab === "EXISTING" ? "border-accent bg-accent text-bone-0" : "border-ink-15 text-ink-70"
          }`}
        >
          Existing
        </button>
        {(showProposed || proposedGeo) && (
          <button
            type="button"
            onClick={() => setTab("PROPOSED")}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              tab === "PROPOSED" ? "border-accent bg-accent text-bone-0" : "border-ink-15 text-ink-70"
            }`}
          >
            Proposed
          </button>
        )}
        <button
          type="button"
          onClick={applyExistingTemplate}
          className="rounded-full border border-ink-15 px-4 py-1.5 text-sm text-ink-70 hover:border-ink-40"
        >
          {existingGeo ? "Reset to template" : "Apply room template"}
        </button>
        <button
          type="button"
          onClick={generateProposed}
          className="rounded-full border border-ink-15 px-4 py-1.5 text-sm text-ink-70 hover:border-ink-40"
        >
          Generate proposed from goals
        </button>
      </div>

      {note && <p className="text-sm text-green-800">{note}</p>}

      {!existingGeo && tab === "EXISTING" && (
        <div className="rounded-lg border border-dashed border-ink-15 bg-bone-0 p-6 text-center">
          <p className="text-sm text-ink-70">
            No layout yet. Apply a template sized from your description
            {answers.roomSizeBand ? ` (${answers.roomSizeBand})` : ""}, then tweak fixtures.
          </p>
          <button
            type="button"
            onClick={applyExistingTemplate}
            className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Apply room template
          </button>
        </div>
      )}

      {tab === "EXISTING" && existingGeo && (
        <DiagramBuilder
          key={`existing-${existingKey}`}
          layoutType="EXISTING"
          projectId={projectId}
          initialGeometry={existingGeo}
          compactHeader
        />
      )}

      {tab === "PROPOSED" && proposedGeo && (
        <DiagramBuilder
          key={`proposed-${proposedKey}`}
          layoutType="PROPOSED"
          projectId={projectId}
          initialGeometry={proposedGeo}
          compactHeader
        />
      )}

      {tab === "PROPOSED" && !proposedGeo && (
        <div className="rounded-lg border border-dashed border-ink-15 p-6 text-center">
          <p className="text-sm text-ink-70">Generate a proposed layout from your goals, or draw from scratch after applying an existing template.</p>
          <button
            type="button"
            onClick={generateProposed}
            className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Generate proposed
          </button>
        </div>
      )}
    </div>
  );
}
