"use client";

import { useEffect, useState } from "react";
import type { StepProps } from "../planner-types";
import { BATHROOM_TYPES, PROJECT_OBJECTIVES } from "@/lib/bathroom/config";
import { ROOM_SIZE_BANDS, resolveRoomFeet } from "@/lib/bathroom/layout-templates";
import { setCanonical } from "@/lib/bathroom/answer-normalization";

type MediaItem = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  caption: string | null;
  wallLabel: string | null;
  url: string;
};

const WALL_OPTIONS = [
  { id: "", label: "General / whole room" },
  { id: "vanity_wall", label: "Wall with vanity" },
  { id: "tub_shower_wall", label: "Wall with tub/shower" },
  { id: "toilet_wall", label: "Wall with toilet" },
  { id: "door_wall", label: "Wall with door" },
  { id: "floor", label: "Floor" },
  { id: "ceiling", label: "Ceiling" },
  { id: "problem_area", label: "Problem area" },
  { id: "inspiration", label: "Inspiration" },
  { id: "not_sure", label: "Not sure" },
];

export function PhotoUploadPanel({ projectId, onCountChange }: { projectId: string | null; onCountChange?: (n: number) => void }) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [wallLabel, setWallLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const refresh = async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/bathroom-projects/${projectId}/media`);
      if (!res.ok) return;
      const data = (await res.json()) as { media: MediaItem[] };
      setMedia(data.media);
      onCountChange?.(data.media.length);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const uploadFiles = async (files: FileList | File[]) => {
    if (!projectId) {
      setError("Answer a question first so we can create your project draft, then upload photos.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        if (wallLabel) fd.append("wallLabel", wallLabel);
        fd.append("kind", wallLabel === "inspiration" ? "inspiration" : "photo");
        const res = await fetch(`/api/bathroom-projects/${projectId}/media`, {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `Upload failed (${res.status})`);
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (mediaId: string) => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/bathroom-projects/${projectId}/media`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Delete failed");
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-ink-100">Upload photos</h3>
        <p className="mt-1 text-sm text-ink-70">
          Add photos of each wall, the ceiling, and any problem areas. Photos improve estimate confidence.
          JPEG, PNG, or WebP · max 10 MB each · up to 20 photos.
        </p>
      </div>

      <label className="block text-sm">
        <span className="text-muted">What does this photo show?</span>
        <select
          value={wallLabel}
          onChange={(e) => setWallLabel(e.target.value)}
          className="mt-1 w-full rounded-lg border border-ink-15 p-2 text-sm sm:max-w-xs"
        >
          {WALL_OPTIONS.map((o) => (
            <option key={o.id || "general"} value={o.id}>{o.label}</option>
          ))}
        </select>
      </label>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition ${
          dragOver ? "border-accent bg-accent/5" : "border-ink-15 bg-bone-1"
        }`}
      >
        <p className="text-sm text-ink-70">Drag and drop photos here, or</p>
        <label className="mt-2 inline-block cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">
          {uploading ? "Uploading…" : "Choose photos"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            multiple
            disabled={uploading || !projectId}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) void uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        {!projectId && (
          <p className="mt-2 text-xs text-ink-40">Start typing your description above to create a draft, then upload photos.</p>
        )}
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      {media.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {media.map((m) => (
            <li key={m.id} className="overflow-hidden rounded-lg border border-ink-15 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt={m.caption || m.fileName} className="h-36 w-full object-cover" />
              <div className="flex items-start justify-between gap-2 p-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-ink-100">{m.wallLabel || "Photo"}</p>
                  <p className="truncate text-xs text-ink-40">{m.fileName}</p>
                </div>
                <button type="button" onClick={() => remove(m.id)} className="shrink-0 text-xs text-red-700 underline">
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RequirementsPromptStep({ answers, setAnswer, projectId }: StepProps) {
  const [prompt, setPrompt] = useState(answers.requirementsPrompt ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [summary, setSummary] = useState(answers.requirementsSummary ?? "");

  // Persist description as the user types so a draft project is created for photo uploads.
  useEffect(() => {
    if (!prompt.trim()) return;
    const t = setTimeout(() => {
      if (prompt !== (answers.requirementsPrompt ?? "")) {
        setAnswer("requirementsPrompt", prompt);
      }
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt]);

  const applyPrompt = async () => {
    if (prompt.trim().length < 10) {
      setError("Write at least a sentence about what you want.");
      return;
    }
    setAnswer("requirementsPrompt", prompt);
    if (!projectId) {
      setError("Creating your draft… wait a moment, then click Apply again.");
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch(`/api/bathroom-projects/${projectId}/interpret`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);

      const nextAnswers = data.answers as Record<string, string>;
      for (const [k, v] of Object.entries(nextAnswers)) {
        if (v) setAnswer(k, v);
      }
      setSummary(data.interpreted?.requirementsSummary ?? "");
      setFollowUps(data.interpreted?.followUpQuestions ?? []);
      setNote(data.note ?? "Answers updated from your description.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not interpret prompt");
    } finally {
      setBusy(false);
    }
  };

  const setCanonicalAnswer = (key: string, value: string) => {
    const next = setCanonical(answers, key as any, value);
    // Emit each changed canonical key so the parent state updates
    for (const [k, v] of Object.entries(next)) {
      if (answers[k] !== v) {
        setAnswer(k, v);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-100">Capture your remodel</h2>
        <p className="mt-1 text-sm text-ink-70">
          Enter your location, describe what you want, pick an approximate room size, and add photos.
          We&apos;ll fill the rest — review on Layout and Results. Not a quote or diagnosis.
        </p>
      </div>

      {/* Location — required for localized estimate */}
      <div>
        <p className="text-sm font-medium text-ink-100">Project ZIP code *</p>
        <p className="mt-0.5 text-xs text-ink-40">Used for localized planning range and permit guidance.</p>
        <input
          type="text"
          inputMode="numeric"
          maxLength={5}
          value={answers.zipCode || answers.zip || ""}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "").slice(0, 5);
            setCanonicalAnswer("zipCode", val);
          }}
          placeholder="e.g. 20850"
          className="mt-2 w-full rounded-lg border border-ink-15 p-3 text-sm sm:max-w-xs"
        />
      </div>

      <div>
        <p className="text-sm font-medium text-ink-100">Approximate room size</p>
        <p className="mt-0.5 text-xs text-ink-40">Optional — unlocks a layout template without exact measurements.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ROOM_SIZE_BANDS.map((b) => {
            const selected = answers.roomSizeBand === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setAnswer("roomSizeBand", b.id);
                  const feet = resolveRoomFeet({ roomSizeBand: b.id });
                  const next = setCanonical(answers, "lengthFt", String(feet.lengthFt));
                  for (const [k, v] of Object.entries(next)) {
                    if (answers[k] !== v) setAnswer(k, v);
                  }
                  setAnswer("widthFt", String(feet.widthFt));
                  setAnswer("ceilingFt", String(feet.ceilingFt));
                  setAnswer("measurementMethod", "simple");
                }}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  selected ? "border-accent bg-accent text-bone-0" : "border-ink-15 text-ink-70 hover:border-ink-40"
                }`}
              >
                {b.label}
                <span className={`ml-1 text-xs ${selected ? "text-bone-0/80" : "text-ink-40"}`}>{b.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!answers.bathroomType && (
        <div>
          <p className="text-sm font-medium text-ink-100">Bathroom type</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {BATHROOM_TYPES.filter((t) => t.id !== "other" && t.id !== "new_addition").map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setAnswer("bathroomType", t.id)}
                className="rounded-full border border-ink-15 px-3 py-1.5 text-sm text-ink-70 hover:border-ink-40"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!answers.projectObjective && (
        <div>
          <p className="text-sm font-medium text-ink-100">Main goal</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PROJECT_OBJECTIVES.filter((o) =>
              ["tub_to_shower", "remodel_same_layout", "cosmetic_refresh", "curbless_shower", "full_gut", "accessibility_upgrade"].includes(o.id),
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setAnswer("projectObjective", o.id)}
                className="rounded-full border border-ink-15 px-3 py-1.5 text-sm text-ink-70 hover:border-ink-40"
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={6}
        className="w-full rounded-xl border border-ink-15 p-4 text-sm leading-relaxed"
        placeholder="Example: Primary bathroom in our Rockville condo. Want to remove the tub and add a curbless tiled shower with a bench, keep the toilet location, replace the double vanity, and fix soft flooring near the tub. Prefer mid-range finishes. Occupied during construction."
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={applyPrompt}
          disabled={busy}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? "Interpreting…" : "Apply description"}
        </button>
        <button
          type="button"
          onClick={() => {
            setAnswer("requirementsPrompt", prompt);
            setNote("Saved. Continue to Layout when ready.");
          }}
          className="rounded-lg border border-ink-15 px-4 py-2 text-sm text-ink-70 hover:border-ink-40"
        >
          Save this draft on this device
        </button>
        {projectId ? (
          <span className="text-xs text-ink-40">Draft ready — you can upload photos</span>
        ) : prompt.trim() || answers.roomSizeBand ? (
          <span className="text-xs text-ink-40">Creating draft…</span>
        ) : null}
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {note && <p className="text-sm text-green-800">{note}</p>}
      {summary && (
        <div className="rounded-lg border border-ink-15 bg-bone-1 p-4 text-sm text-ink-70">
          <p className="font-medium text-ink-100">Summary</p>
          <p className="mt-1">{summary}</p>
        </div>
      )}
      {followUps.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="font-medium text-amber-900">Suggested follow-ups</p>
          <ul className="mt-2 list-disc pl-5 text-amber-900">
            {followUps.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      <PhotoUploadPanel
        projectId={projectId}
        onCountChange={(n) => setAnswer("photo_count", String(n))}
      />
    </div>
  );
}
