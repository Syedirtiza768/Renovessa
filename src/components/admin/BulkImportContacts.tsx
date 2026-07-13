"use client";

import { useRef, useState } from "react";

interface Props {
  onImported: () => void;
}

interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: { row: number; email: string; error: string }[];
}

const EXPECTED_COLUMNS = [
  { field: "company_name", required: true },
  { field: "contact_person", required: false },
  { field: "email", required: true },
  { field: "phone", required: false },
  { field: "trade", required: false },
  { field: "city", required: false },
  { field: "state", required: false },
  { field: "website", required: false },
  { field: "service_zips", required: false },
];

export function BulkImport({ onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);

    // Read first 6 lines for preview
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const lines = text.split(/\r?\n/).filter(Boolean).slice(0, 6);
      const rows = lines.map((line) => parseCsvLine(line));
      setPreview(rows);
    };
    reader.readAsText(f.slice(0, 4096));
  }

  function parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"') {
          if (line[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        fields.push(field); field = "";
      } else field += c;
    }
    fields.push(field);
    return fields;
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setError(null);
    setResult(null);

    const fd = new FormData();
    fd.set("file", file);

    const res = await fetch("/api/contacts/import", { method: "POST", body: fd });
    const data = await res.json();
    setImporting(false);

    if (!res.ok) {
      setError(data.error || "Import failed");
      return;
    }

    setResult(data);
    if (data.created > 0) onImported();
  }

  function reset() {
    setFile(null);
    setPreview([]);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function close() {
    setOpen(false);
    reset();
  }

  return (
    <>
      <button className="btn-secondary text-sm" onClick={() => setOpen(true)}>
        Import CSV
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={close}>
          <div
            className="card mx-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Import Contacts from CSV</h2>
              <button type="button" onClick={close} className="text-muted hover:text-slate text-xl leading-none">&times;</button>
            </div>

            {error && (
              <div className="mb-3 rounded-md bg-[#FDECEA] px-3 py-2 text-sm text-danger">{error}</div>
            )}

            {!result ? (
              <>
                {/* Expected format */}
                <div className="mb-4 rounded-lg bg-blueprint/30 p-3 text-sm">
                  <p className="font-medium mb-1.5">Expected CSV columns:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {EXPECTED_COLUMNS.map((c) => (
                      <code key={c.field} className={`rounded px-1.5 py-0.5 text-xs ${c.required ? "bg-copper/20 text-copper font-medium" : "bg-blueprint text-muted"}`}>
                        {c.field}{c.required ? " *" : ""}
                      </code>
                    ))}
                  </div>
                  <p className="text-muted text-xs mt-1.5">* Required. Other column names like <code>company</code>, <code>category</code>, <code>name</code> are also accepted.</p>
                </div>

                {/* File picker */}
                <div className="mb-4">
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-copper file:px-3 file:py-2 file:text-sm file:font-medium file:text-white file:cursor-pointer hover:file:bg-copper/90"
                  />
                </div>

                {/* Preview */}
                {preview.length > 1 && (
                  <div className="mb-4 overflow-x-auto">
                    <p className="text-xs font-medium text-muted mb-1.5">Preview (first {preview.length - 1} rows):</p>
                    <table className="w-full text-xs border border-rule rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-blueprint/40 text-left">
                          {preview[0].map((h, i) => (
                            <th key={i} className="px-2 py-1.5 font-medium text-muted">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.slice(1).map((row, i) => (
                          <tr key={i} className="border-t border-rule">
                            {row.map((cell, j) => (
                              <td key={j} className="px-2 py-1.5 truncate max-w-[120px]">{cell || <span className="text-muted">—</span>}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {preview.length >= 6 && (
                      <p className="text-xs text-muted mt-1">…and more rows in the file</p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  <button className="btn-secondary text-sm" onClick={close}>Cancel</button>
                  <button
                    className="btn-primary text-sm"
                    disabled={!file || importing}
                    onClick={handleImport}
                  >
                    {importing ? "Importing…" : "Import"}
                  </button>
                </div>
              </>
            ) : (
              /* Results */
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-[#E8F5EE] p-3 text-center">
                    <p className="text-2xl font-bold text-success">{result.created}</p>
                    <p className="text-xs text-muted">Created</p>
                  </div>
                  <div className="rounded-lg bg-[#FEF3E2] p-3 text-center">
                    <p className="text-2xl font-bold text-warning">{result.skipped}</p>
                    <p className="text-xs text-muted">Skipped (exists)</p>
                  </div>
                  <div className="rounded-lg bg-blueprint/30 p-3 text-center">
                    <p className="text-2xl font-bold text-muted">{result.total}</p>
                    <p className="text-xs text-muted">Total rows</p>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="rounded-lg bg-[#FDECEA] p-3">
                    <p className="text-sm font-medium text-danger mb-1.5">{result.errors.length} error{result.errors.length > 1 ? "s" : ""}:</p>
                    <ul className="text-xs text-danger space-y-0.5">
                      {result.errors.slice(0, 10).map((e, i) => (
                        <li key={i}>Row {e.row}{e.email ? ` (${e.email})` : ""}: {e.error}</li>
                      ))}
                      {result.errors.length > 10 && <li>…and {result.errors.length - 10} more</li>}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button className="btn-secondary text-sm" onClick={reset}>Import Another</button>
                  <button className="btn-primary text-sm" onClick={close}>Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
