/**
 * Retry-wrapped fetch for CardVision's reference-image download step (see
 * reference-index.ts). Mirrors src/lib/scan/ai-provider.ts's
 * fetchAnthropicMessages() retry/backoff shape (same retryable-status set,
 * same attempt count, same exponential-backoff-with-jitter formula) but is
 * image-fetch specific: no auth header, and it classifies the response
 * rather than just returning it. Deliberately NOT imported from
 * ai-provider.ts — that file is Anthropic-specific, and its own header
 * comment already documents this repo's convention of duplicating this
 * amount of retry boilerplate per call site rather than sharing it across
 * unrelated concerns (the Gemini/Claude split it mentions).
 */

// Same retryable-status set as fetchAnthropicMessages: 429 rate limited,
// 500/502/503/504 server errors, 408 request timeout, 529 "overloaded".
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504, 408, 529]);
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 500;

/** How long a single fetch attempt may take before it's treated as a timeout failure. */
const TIMEOUT_MS = 10_000;

export type FetchImageOutcome =
  | { kind: "ok"; data: Uint8Array; contentType: string }
  /** Not retryable — a bad/malformed URL, a non-image response, or an empty/corrupted body. */
  | { kind: "invalid"; reason: string }
  /** Retryable-class failure that exhausted its retries — network error, timeout, or a persistent bad HTTP status. */
  | { kind: "failed"; reason: string };

/** First few bytes of the most common reference-image formats, for a best-effort "is this actually an image" sniff beyond trusting the content-type header (CDNs can serve wrong/missing ones). Not full image validation. */
const IMAGE_MAGIC_NUMBERS: { bytes: number[]; label: string }[] = [
  { bytes: [0xff, 0xd8, 0xff], label: "jpeg" },
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], label: "png" },
  { bytes: [0x47, 0x49, 0x46, 0x38], label: "gif" },
  // WEBP: "RIFF" .... "WEBP" — the 4 middle bytes are a file-size field, so
  // only the two fixed anchors are checked (see looksLikeImage below).
  { bytes: [0x52, 0x49, 0x46, 0x46], label: "riff" },
];

function looksLikeImage(bytes: Uint8Array): boolean {
  for (const { bytes: magic } of IMAGE_MAGIC_NUMBERS) {
    if (bytes.length < magic.length) continue;
    if (!magic.every((b, i) => bytes[i] === b)) continue;
    // RIFF containers are also used by e.g. WAV — confirm the WEBP tag at offset 8 before accepting.
    if (magic[0] === 0x52) {
      if (bytes.length < 12 || !(bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50)) continue;
    }
    return true;
  }
  return false;
}

/** Syntactically validates a reference-image URL — http/https only, well-formed. */
export function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function fetchOnce(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Downloads a reference image with retry/backoff, then classifies the
 * result — never throws. Retries both retryable HTTP statuses and thrown
 * errors (network failures, aborts/timeouts).
 */
export async function fetchImageBytes(url: string): Promise<FetchImageOutcome> {
  if (!isValidImageUrl(url)) return { kind: "invalid", reason: "malformed or non-http(s) URL" };

  let lastErrorReason = "unknown error";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetchOnce(url);

      if (res.ok) {
        const contentType = res.headers.get("content-type") ?? "";
        const buffer = new Uint8Array(await res.arrayBuffer());
        if (buffer.length === 0) return { kind: "invalid", reason: "empty response body" };
        if (!contentType.toLowerCase().startsWith("image/")) {
          return { kind: "invalid", reason: `unexpected content-type "${contentType || "none"}"` };
        }
        if (!looksLikeImage(buffer)) return { kind: "invalid", reason: "response body is not a recognized image format" };
        return { kind: "ok", data: buffer, contentType };
      }

      if (!RETRYABLE_STATUSES.has(res.status)) return { kind: "invalid", reason: `HTTP ${res.status}` };
      lastErrorReason = `HTTP ${res.status}`;
      if (attempt >= MAX_ATTEMPTS) return { kind: "failed", reason: lastErrorReason };
    } catch (err) {
      lastErrorReason = err instanceof Error && err.name === "AbortError" ? "timeout" : err instanceof Error ? err.message : String(err);
      if (attempt >= MAX_ATTEMPTS) return { kind: "failed", reason: lastErrorReason };
    }

    // Exponential backoff with jitter: ~500ms, ~1000ms.
    const delayMs = BASE_DELAY_MS * 2 ** (attempt - 1) + Math.random() * 250;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  // Unreachable in practice (the loop always returns above once attempt >= MAX_ATTEMPTS).
  return { kind: "failed", reason: lastErrorReason };
}
