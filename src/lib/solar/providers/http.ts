/**
 * Shared HTTP plumbing for solar provider adapters (§38, §37).
 *
 * Everything a third-party call needs to be safe in a conversion-critical path:
 * hard timeouts via AbortController, bounded retries with backoff, and typed
 * failures instead of thrown strings, so callers can route to the right
 * fallback rather than showing a generic error.
 *
 * Provider API keys are read from `process.env` inside adapters only. This
 * module is server-only; it must never be imported from a client component.
 */

export type HttpFailureKind =
  | "TIMEOUT"
  | "NETWORK"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "BAD_REQUEST"
  | "SERVER_ERROR"
  | "MALFORMED_RESPONSE";

export interface HttpFailure {
  ok: false;
  kind: HttpFailureKind;
  status?: number;
  /** Internal detail for logs. Never rendered to a homeowner verbatim. */
  detail: string;
}

export type HttpResult<T> = { ok: true; data: T; retrievedAt: string } | HttpFailure;

export const DEFAULT_TIMEOUT_MS = Number(process.env.SOLAR_PROVIDER_TIMEOUT_MS || 8000);
const DEFAULT_MAX_ATTEMPTS = 3;

function classify(status: number): HttpFailureKind {
  if (status === 404) return "NOT_FOUND";
  if (status === 401 || status === 403) return "UNAUTHORIZED";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "SERVER_ERROR";
  return "BAD_REQUEST";
}

/** Only transient conditions are retried — a 404 or a bad key never is. */
function isRetryable(kind: HttpFailureKind): boolean {
  return kind === "TIMEOUT" || kind === "NETWORK" || kind === "SERVER_ERROR" || kind === "RATE_LIMITED";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface GetJsonOptions {
  timeoutMs?: number;
  maxAttempts?: number;
  /** Caller-supplied signal, so an abandoned request can be cancelled upstream. */
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

/**
 * GET a JSON document with timeout, bounded retry and typed failure.
 * The URL is built by the caller so query construction stays adapter-local.
 */
export async function getJson<T>(url: string, opts: GetJsonOptions = {}): Promise<HttpResult<T>> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = Math.max(1, opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);

  let last: HttpFailure = { ok: false, kind: "NETWORK", detail: "no attempt made" };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // Propagate an upstream cancellation into this attempt.
    const onAbort = () => controller.abort();
    opts.signal?.addEventListener("abort", onAbort);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json", ...(opts.headers ?? {}) },
        cache: "no-store",
      });

      if (!res.ok) {
        const kind = classify(res.status);
        const body = await res.text().catch(() => "");
        last = { ok: false, kind, status: res.status, detail: body.slice(0, 500) };
        if (!isRetryable(kind) || attempt === maxAttempts) return last;
      } else {
        let data: T;
        try {
          data = (await res.json()) as T;
        } catch (e) {
          return { ok: false, kind: "MALFORMED_RESPONSE", status: res.status, detail: String(e) };
        }
        return { ok: true, data, retrievedAt: new Date().toISOString() };
      }
    } catch (e) {
      const aborted = (e as Error)?.name === "AbortError";
      // An upstream cancellation is not our failure to retry.
      if (aborted && opts.signal?.aborted) {
        return { ok: false, kind: "NETWORK", detail: "cancelled by caller" };
      }
      last = { ok: false, kind: aborted ? "TIMEOUT" : "NETWORK", detail: String(e) };
      if (attempt === maxAttempts) return last;
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onAbort);
    }

    // Exponential backoff with a small jitter so retries do not synchronise.
    await sleep(Math.min(2000, 250 * 2 ** (attempt - 1)) + Math.random() * 100);
  }

  return last;
}

/** Build a query string, dropping undefined/null so optional params stay absent. */
export function queryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  return sp.toString();
}

/** Redact key-like query params before a URL reaches a log (§64). */
export function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    for (const k of ["key", "api_key", "apiKey", "token"]) {
      if (u.searchParams.has(k)) u.searchParams.set(k, "REDACTED");
    }
    return u.toString();
  } catch {
    return "[unparseable url]";
  }
}
