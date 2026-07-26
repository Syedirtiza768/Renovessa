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
  const wantsProposed = needsProposedLayout(answers);
  const [tab, setTab] = useState<LayoutTab>("EXISTING");
  const [existingGeo, setExistingGeo] = useState<LayoutGeometry | null>(null);
  const [proposedGeo, setProposedGeo] = useState<LayoutGeometry | null>(null);
  const [existingKey, setExistingKey] = useState(0);
  const [proposedKey, setProposedKey] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const feet = useMemo(() => resolveRoomFeet(answers), [answers]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/bathroom-projects/${projectId}/layouts`);
        const rows = res.ok
          ? ((await res.json()) as Array<{ layoutType: string; geometryJson: LayoutGeometry }>)
          : [];
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
          setNote("We placed a starting layout — nudge fixtures if something’s off, then continue.");
        }

        if (proposed?.geometryJson) {
          setProposedGeo(proposed.geometryJson);
          setProposedKey((k) => k + 1);
        } else if (wantsProposed) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const resetTemplate = () => {
    const geo = buildExistingTemplate(answers);
    setExistingGeo(geo);
    setExistingKey((k) => k + 1);
    setAnswer("length", String(feet.lengthFt));
    setAnswer("width", String(feet.widthFt));
    setAnswer("ceilingHeight", String(feet.ceilingFt));
    setAnswer("has_diagram", "yes");
    setNote("Reset to a clean starting layout.");
    setTab("EXISTING");
  };

  const generateProposed = () => {
    const base = existingGeo ?? buildExistingTemplate(answers);
    if (!existingGeo) {
      setExistingGeo(base);
      setExistingKey((k) => k + 1);
    }
    setProposedGeo(buildProposedFromExisting(base, answers));
    setProposedKey((k) => k + 1);
    setAnswer("forceProposedLayout", "yes");
    setAnswer("has_diagram", "yes");
    setNote("Proposed layout updated from your goals.");
    setTab("PROPOSED");
  };

  if (loading) {
    return <p className="text-sm text-ink-70">Loading layout…</p>;
  }

  const showProposedTab = wantsProposed || Boolean(proposedGeo) || answers.forceProposedLayout === "yes";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-ink-100">Room layout</h2>
        <p className="mt-1 text-sm text-ink-70">
          Rough sketch for planning — not a construction drawing. Drag to adjust, or skip ahead if the template is close enough.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {showProposedTab && (
          <>
            <button
              type="button"
              onClick={() => setTab("EXISTING")}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                tab === "EXISTING" ? "border-accent bg-accent text-bone-0" : "border-ink-15 text-ink-70"
              }`}
            >
              Existing
            </button>
            <button
              type="button"
              onClick={() => setTab("PROPOSED")}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                tab === "PROPOSED" ? "border-accent bg-accent text-bone-0" : "border-ink-15 text-ink-70"
              }`}
            >
              After remodel
            </button>
          </>
        )}
        <button
          type="button"
          onClick={resetTemplate}
          className="rounded-full border border-ink-15 px-4 py-1.5 text-sm text-ink-70 hover:border-ink-40"
        >
          Reset layout
        </button>
        {wantsProposed && (
          <button
            type="button"
            onClick={generateProposed}
            className="rounded-full border border-ink-15 px-4 py-1.5 text-sm text-ink-70 hover:border-ink-40"
          >
            Refresh after-remodel view
          </button>
        )}
        {!wantsProposed && !proposedGeo && (
          <button
            type="button"
            onClick={generateProposed}
            className="rounded-full border border-ink-15 px-4 py-1.5 text-sm text-ink-40 hover:border-ink-40"
          >
            Add after-remodel view
          </button>
        )}
      </div>

      {note && <p className="text-sm text-ink-70">{note}</p>}

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
          <p className="text-sm text-ink-70">Optional — generate a simple after-remodel sketch from your goals.</p>
          <button
            type="button"
            onClick={generateProposed}
            className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Generate after-remodel view
          </button>
        </div>
      )}
    </div>
  );
}
