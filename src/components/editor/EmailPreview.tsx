"use client";

import { useState } from "react";

interface Props {
  html: string;
}

/**
 * Renders an HTML email preview inside a sandboxed iframe.
 * Supports desktop/mobile width toggle.
 */
export function EmailPreview({ html }: Props) {
  const [width, setWidth] = useState<"desktop" | "mobile">("desktop");

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-medium text-muted">Preview</span>
        <button
          type="button"
          onClick={() => setWidth("desktop")}
          className={`rounded px-2 py-0.5 text-xs ${width === "desktop" ? "bg-blueprint text-copper font-medium" : "text-muted"}`}
        >
          Desktop
        </button>
        <button
          type="button"
          onClick={() => setWidth("mobile")}
          className={`rounded px-2 py-0.5 text-xs ${width === "mobile" ? "bg-blueprint text-copper font-medium" : "text-muted"}`}
        >
          Mobile
        </button>
      </div>
      <div
        className="mx-auto overflow-hidden rounded border border-rule bg-white"
        style={{ maxWidth: width === "mobile" ? "375px" : "100%" }}
      >
        <iframe
          srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#1a1a1a;padding:24px;margin:0}p{margin:0 0 16px}a{color:#b5541e}h1,h2,h3{margin:1em 0 0.5em}ul,ol{margin:0 0 16px;padding-left:24px}blockquote{border-left:3px solid #d0d7dd;margin:0 0 16px;padding:8px 16px;color:#7f8c8d}</style></head><body>${html}</body></html>`}
          className="w-full border-0"
          style={{ minHeight: "300px" }}
          sandbox=""
          title="Email preview"
        />
      </div>
    </div>
  );
}
