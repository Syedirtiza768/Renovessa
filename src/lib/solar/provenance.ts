/**
 * Provenance system (§34).
 *
 * Every number a homeowner sees must be traceable to one of:
 *   A. an authoritative source,
 *   B. a deterministic calculation from known inputs, or
 *   C. an explicitly labelled assumption.
 *
 * AI is never an authoritative source.
 *
 * The wrapper is a plain value object so it can cross the API boundary as JSON
 * and be persisted inside estimate snapshots without a separate table.
 */

export type SourceType =
  /** A third-party API we treat as authoritative for this field (Google Solar, PVWatts, OpenEI). */
  | "authoritative_api"
  /** A utility document the homeowner supplied (bill PDF/photo). */
  | "utility_document"
  /** A government / official published source (incentive program page, code document). */
  | "government_source"
  /** The homeowner typed or selected it. */
  | "homeowner_input"
  /** The homeowner uploaded a file we derived it from. */
  | "homeowner_upload"
  /** Renovessa's own market data (contractor proposals, awarded bids). */
  | "renovation_market_data"
  /** Computed by a versioned pure function from other tracked values. */
  | "deterministic_calculation"
  /** Extracted by an AI model — always a draft, never authoritative. */
  | "ai_extracted"
  /** A stated planning assumption with no source behind it. */
  | "assumption";

export type ProvenanceConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface Provenance {
  sourceType: SourceType;
  /** Human-readable source, e.g. "Google Solar API — buildingInsights". */
  sourceName: string;
  /** Identifier within the source: a record id, tariff label, config version. */
  sourceRecord?: string;
  /** ISO timestamp the value was retrieved from its source. */
  retrievedAt?: string;
  /** ISO date the underlying source data became effective (tariff start, imagery date). */
  effectiveAt?: string;
  confidence: ProvenanceConfidence;
  isAssumption: boolean;
  isUserProvided: boolean;
  isUserConfirmed: boolean;
  /** Version of the pure function that produced it, for calculated values. */
  calculationVersion?: string;
  /** The "Why this number?" sentence shown to the homeowner. Plain language. */
  explanation?: string;
  /** Tracked values this one was derived from, for the inspector UI. */
  derivedFrom?: string[];
}

export interface Tracked<T> {
  value: T;
  /** Display unit, e.g. "kWh/year", "kW", "USD", "%". Omit for unitless. */
  unit?: string;
  provenance: Provenance;
}

/** A value that may legitimately be unavailable. Never substitute a default for `null`. */
export type MaybeTracked<T> = Tracked<T> | null;

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

export function fromApi<T>(
  value: T,
  opts: {
    unit?: string;
    sourceName: string;
    sourceRecord?: string;
    retrievedAt?: string;
    effectiveAt?: string;
    confidence?: ProvenanceConfidence;
    explanation?: string;
  },
): Tracked<T> {
  return {
    value,
    unit: opts.unit,
    provenance: {
      sourceType: "authoritative_api",
      sourceName: opts.sourceName,
      sourceRecord: opts.sourceRecord,
      retrievedAt: opts.retrievedAt ?? new Date().toISOString(),
      effectiveAt: opts.effectiveAt,
      confidence: opts.confidence ?? "HIGH",
      isAssumption: false,
      isUserProvided: false,
      isUserConfirmed: false,
      explanation: opts.explanation,
    },
  };
}

export function fromCalculation<T>(
  value: T,
  opts: {
    unit?: string;
    calculationVersion: string;
    explanation: string;
    derivedFrom?: string[];
    confidence?: ProvenanceConfidence;
    sourceName?: string;
  },
): Tracked<T> {
  return {
    value,
    unit: opts.unit,
    provenance: {
      sourceType: "deterministic_calculation",
      sourceName: opts.sourceName ?? "Renovessa deterministic model",
      confidence: opts.confidence ?? "HIGH",
      isAssumption: false,
      isUserProvided: false,
      isUserConfirmed: false,
      calculationVersion: opts.calculationVersion,
      explanation: opts.explanation,
      derivedFrom: opts.derivedFrom,
    },
  };
}

export function fromHomeowner<T>(
  value: T,
  opts: {
    unit?: string;
    explanation: string;
    confidence?: ProvenanceConfidence;
    confirmed?: boolean;
    sourceName?: string;
  },
): Tracked<T> {
  return {
    value,
    unit: opts.unit,
    provenance: {
      sourceType: "homeowner_input",
      sourceName: opts.sourceName ?? "Homeowner-provided",
      confidence: opts.confidence ?? "MEDIUM",
      isAssumption: false,
      isUserProvided: true,
      isUserConfirmed: opts.confirmed ?? true,
      explanation: opts.explanation,
    },
  };
}

export function fromMarketData<T>(
  value: T,
  opts: {
    unit?: string;
    sourceName: string;
    sourceRecord?: string;
    effectiveAt?: string;
    confidence?: ProvenanceConfidence;
    explanation: string;
  },
): Tracked<T> {
  return {
    value,
    unit: opts.unit,
    provenance: {
      sourceType: "renovation_market_data",
      sourceName: opts.sourceName,
      sourceRecord: opts.sourceRecord,
      effectiveAt: opts.effectiveAt,
      confidence: opts.confidence ?? "MEDIUM",
      isAssumption: false,
      isUserProvided: false,
      isUserConfirmed: false,
      explanation: opts.explanation,
    },
  };
}

export function fromGovernmentSource<T>(
  value: T,
  opts: {
    unit?: string;
    sourceName: string;
    sourceRecord?: string;
    effectiveAt?: string;
    retrievedAt?: string;
    explanation: string;
  },
): Tracked<T> {
  return {
    value,
    unit: opts.unit,
    provenance: {
      sourceType: "government_source",
      sourceName: opts.sourceName,
      sourceRecord: opts.sourceRecord,
      effectiveAt: opts.effectiveAt,
      retrievedAt: opts.retrievedAt,
      confidence: "HIGH",
      isAssumption: false,
      isUserProvided: false,
      isUserConfirmed: false,
      explanation: opts.explanation,
    },
  };
}

/**
 * An explicitly labelled planning assumption. The UI must render these
 * differently from sourced values — that is the entire point of the type.
 */
export function assumed<T>(
  value: T,
  opts: { unit?: string; explanation: string; sourceName?: string },
): Tracked<T> {
  return {
    value,
    unit: opts.unit,
    provenance: {
      sourceType: "assumption",
      sourceName: opts.sourceName ?? "Renovessa planning assumption",
      confidence: "LOW",
      isAssumption: true,
      isUserProvided: false,
      isUserConfirmed: false,
      explanation: opts.explanation,
    },
  };
}

/**
 * An AI-extracted draft. Deliberately starts unconfirmed and LOW: nothing
 * downstream may consume it in a financial calculation until the homeowner
 * confirms it via `confirm()` (§19, §32).
 */
export function fromAiExtraction<T>(
  value: T,
  opts: { unit?: string; sourceName: string; sourceRecord?: string; explanation: string; confidence?: ProvenanceConfidence },
): Tracked<T> {
  return {
    value,
    unit: opts.unit,
    provenance: {
      sourceType: "ai_extracted",
      sourceName: opts.sourceName,
      sourceRecord: opts.sourceRecord,
      retrievedAt: new Date().toISOString(),
      confidence: opts.confidence ?? "LOW",
      isAssumption: false,
      isUserProvided: false,
      isUserConfirmed: false,
      explanation: opts.explanation,
    },
  };
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/** Mark a value as confirmed by the homeowner, optionally correcting it. */
export function confirm<T>(tracked: Tracked<T>, correctedValue?: T): Tracked<T> {
  const corrected = correctedValue !== undefined && correctedValue !== tracked.value;
  return {
    ...tracked,
    value: correctedValue !== undefined ? correctedValue : tracked.value,
    provenance: {
      ...tracked.provenance,
      // A corrected value is the homeowner's, whatever produced the draft.
      sourceType: corrected ? "homeowner_input" : tracked.provenance.sourceType,
      isUserProvided: corrected ? true : tracked.provenance.isUserProvided,
      isUserConfirmed: true,
      confidence: corrected ? "HIGH" : bumpConfidence(tracked.provenance.confidence),
    },
  };
}

function bumpConfidence(c: ProvenanceConfidence): ProvenanceConfidence {
  return c === "LOW" ? "MEDIUM" : c === "MEDIUM" ? "HIGH" : "HIGH";
}

/**
 * May this value be used in a financial calculation?
 *
 * Unconfirmed AI extraction never may (§19). Everything else may, because the
 * provenance travels with it and the UI labels it.
 */
export function isUsableForFinance(p: Provenance): boolean {
  if (p.sourceType === "ai_extracted" && !p.isUserConfirmed) return false;
  return true;
}

/** The weakest confidence among the inputs — how derived values inherit uncertainty. */
export function weakestConfidence(...values: Array<Tracked<unknown> | null | undefined>): ProvenanceConfidence {
  const order: ProvenanceConfidence[] = ["HIGH", "MEDIUM", "LOW"];
  let worst = 0;
  for (const v of values) {
    if (!v) continue;
    const idx = order.indexOf(v.provenance.confidence);
    if (idx > worst) worst = idx;
  }
  return order[worst];
}

/** Does any input rest on a stated assumption? Drives the "assumptions" list. */
export function anyAssumed(...values: Array<Tracked<unknown> | null | undefined>): boolean {
  return values.some((v) => v?.provenance.isAssumption);
}

/** Collect every distinct assumption explanation for display near a result. */
export function collectAssumptions(values: Array<Tracked<unknown> | null | undefined>): string[] {
  const out = new Set<string>();
  for (const v of values) {
    if (v?.provenance.isAssumption && v.provenance.explanation) out.add(v.provenance.explanation);
  }
  return [...out];
}

/** Flatten to the shape the "Why this number?" popover renders. */
export function explain(tracked: Tracked<unknown>): {
  explanation: string;
  sourceLabel: string;
  confidence: ProvenanceConfidence;
  isAssumption: boolean;
  retrievedAt?: string;
  effectiveAt?: string;
  derivedFrom?: string[];
} {
  const p = tracked.provenance;
  return {
    explanation: p.explanation ?? "No explanation was recorded for this value.",
    sourceLabel: sourceLabel(p),
    confidence: p.confidence,
    isAssumption: p.isAssumption,
    retrievedAt: p.retrievedAt,
    effectiveAt: p.effectiveAt,
    derivedFrom: p.derivedFrom,
  };
}

export function sourceLabel(p: Provenance): string {
  switch (p.sourceType) {
    case "authoritative_api":
      return `Source: ${p.sourceName}`;
    case "utility_document":
      return `From your utility document (${p.sourceName})`;
    case "government_source":
      return `Official source: ${p.sourceName}`;
    case "homeowner_input":
      return "You told us this";
    case "homeowner_upload":
      return "Derived from a document you uploaded";
    case "renovation_market_data":
      return `Renovessa market data: ${p.sourceName}`;
    case "deterministic_calculation":
      return "Calculated from the values above";
    case "ai_extracted":
      return p.isUserConfirmed
        ? "Read from your document by AI, confirmed by you"
        : "Read from your document by AI — needs your confirmation";
    case "assumption":
      return "Planning assumption — not a measured value";
  }
}
