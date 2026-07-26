"use client";

import { useEffect, useState } from "react";
import type { StepProps } from "../planner-types";

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
  { id: "north", label: "North wall" },
  { id: "south", label: "South wall" },
  { id: "east", label: "East wall" },
  { id: "west", label: "West wall" },
  { id: "ceiling_shower", label: "Ceiling above shower" },
  { id: "floor", label: "Floor" },
  { id: "under_sink", label: "Under sink / vanity" },
  { id: "inspiration", label: "Inspiration / style" },
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
          Add photos of each wall, the ceiling above the shower, and any problem areas. JPEG, PNG, or WebP · max 10 MB each · up to 20 photos.
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-100">Describe your bathroom remodel</h2>
        <p className="mt-1 text-sm text-ink-70">
          Write what you want in your own words — bathroom type, goals, finishes, problems, timeline.
          Upload photos of the space. We&apos;ll suggest planner answers for you to review. This is not a quote or diagnosis.
        </p>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={7}
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
          {busy ? "Interpreting…" : "Apply to planner answers"}
        </button>
        <button
          type="button"
          onClick={() => {
            setAnswer("requirementsPrompt", prompt);
            setNote("Saved your description. Continue to review or edit the structured answers.");
          }}
          className="rounded-lg border border-ink-15 px-4 py-2 text-sm text-ink-70 hover:border-ink-40"
        >
          Save description only
        </button>
        {projectId ? (
          <span className="text-xs text-ink-40">Draft ready — you can upload photos</span>
        ) : prompt.trim() ? (
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
