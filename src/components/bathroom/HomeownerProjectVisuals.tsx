"use client";

import { useState } from "react";
import type { LayoutGeometry } from "@/lib/bathroom/geometry";
import { DiagramBuilder } from "./DiagramBuilder";

type LayoutRecord = {
  layoutType: string;
  name: string | null;
  geometryJson: unknown;
  createdAt: string;
};

type MediaRecord = {
  kind: string;
  fileName: string;
  mimeType: string;
  caption: string | null;
  wallLabel: string | null;
  createdAt: string;
  url: string;
};

export function HomeownerProjectVisuals({
  projectId,
  layouts,
  media,
}: {
  projectId: string;
  layouts: LayoutRecord[];
  media: MediaRecord[];
}) {
  const [selectedLayout, setSelectedLayout] = useState(0);
  const activeLayout = layouts[selectedLayout] ?? layouts[0];

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <section className="card p-4 lg:col-span-2" aria-labelledby="homeowner-layouts-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="homeowner-layouts-heading" className="font-semibold">Your saved layouts</h2>
            <p className="mt-1 text-sm text-muted">Planning sketches only—not construction or permit drawings.</p>
          </div>
          {layouts.length > 1 && (
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Saved layouts">
              {layouts.map((layout, index) => (
                <button
                  key={`${layout.layoutType}-${index}`}
                  type="button"
                  role="tab"
                  aria-selected={selectedLayout === index}
                  onClick={() => setSelectedLayout(index)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    selectedLayout === index
                      ? "border-copper bg-copper text-white"
                      : "border-rule text-muted hover:border-copper"
                  }`}
                >
                  {layoutLabel(layout.layoutType)}
                </button>
              ))}
            </div>
          )}
        </div>

        {activeLayout ? (
          <div className="mt-4 rounded-lg border border-rule bg-blueprint/30 p-3">
            <p className="mb-3 text-sm font-medium capitalize">
              {activeLayout.name || layoutLabel(activeLayout.layoutType)}
            </p>
            <DiagramBuilder
              projectId={projectId}
              layoutType={activeLayout.layoutType === "EXISTING" ? "EXISTING" : "PROPOSED"}
              initialGeometry={activeLayout.geometryJson as LayoutGeometry}
              compactHeader
              readOnly
            />
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">No layout has been saved for this project.</p>
        )}
      </section>

      <section className="card p-4 lg:col-span-2" aria-labelledby="homeowner-photos-heading">
        <div>
          <h2 id="homeowner-photos-heading" className="font-semibold">Your project photos</h2>
          <p className="mt-1 text-sm text-muted">Photos you uploaded to help describe the existing space.</p>
        </div>
        {media.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {media.map((photo) => (
              <a
                key={`${photo.fileName}-${photo.createdAt}`}
                href={photo.url}
                target="_blank"
                rel="noreferrer"
                className="group overflow-hidden rounded-lg border border-rule bg-white focus:outline-none focus:ring-2 focus:ring-copper"
              >
                <img
                  src={photo.url}
                  alt={photo.caption || photo.wallLabel || "Uploaded project photo"}
                  className="aspect-square w-full object-cover transition group-hover:scale-[1.02]"
                />
                <span className="block p-2 text-xs text-muted">
                  {photo.wallLabel || photo.caption || "Project photo"}
                </span>
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">No photos uploaded for this project.</p>
        )}
      </section>
    </div>
  );
}

function layoutLabel(value: string): string {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
