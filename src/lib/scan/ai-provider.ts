// Calls Anthropic's Messages API directly rather than via the
// @anthropic-ai/sdk package — this app deploys to Cloudflare Workers via
// OpenNext under a 3 MiB Worker size cap (wrangler.jsonc), the same
// constraint that previously ruled out the @google/genai SDK for Gemini
// (see server-image-processor.ts's comment). A raw fetch/auth-header call
// is all either provider's Messages/generateContent endpoint needs for a
// single request/response call like the ones in this app.
//
// Shared by src/lib/scan/claude.ts (identification) and
// src/lib/scanning/detectors/claude-detector.ts (detection): unlike the
// Gemini split (which deliberately duplicated this boilerplate to avoid
// coupling the single-card feature to a multi-card refactor), both Claude
// call sites share identical auth, retry, and error-status handling — only
// the request's `tools`/`system` payload and response parsing differ per
// call site, so only that part stays local to each file.
const ANTHROPIC_API_BASE = "https://api.anthropic.com/v1";
const ANTHROPIC_VERSION = "2023-06-01";

/** Single configuration point for the Claude model used by both call sites. */
export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

// Anthropic's transient-failure statuses: 429 = rate limited, 500/502/503/504
// = server-side errors, 408 = request timeout, 529 = Anthropic-specific
// "overloaded, try again" status. Every other status (400 bad request, 401/403
// auth, 404 unknown model, ...) fails fast, since retrying those just wastes
// time on an error that won't change.
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504, 408, 529]);
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 500;

/**
 * Retry-wrapped POST to the Messages API. Retries both retryable HTTP
 * statuses and thrown network errors (e.g. `fetch` rejecting) — the latter
 * wasn't handled at all in the Gemini port this replaces, a small
 * deliberate improvement bundled into the migration.
 */
export async function fetchAnthropicMessages(body: string, apiKey: string): Promise<Response> {
  let lastNetworkError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${ANTHROPIC_API_BASE}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body,
      });

      if (res.ok || !RETRYABLE_STATUSES.has(res.status) || attempt >= MAX_ATTEMPTS) return res;
      lastNetworkError = undefined;
    } catch (err) {
      lastNetworkError = err;
      if (attempt >= MAX_ATTEMPTS) throw err;
    }

    // Exponential backoff with jitter: ~500ms, ~1000ms.
    const delayMs = BASE_DELAY_MS * 2 ** (attempt - 1) + Math.random() * 250;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  // Unreachable in practice (the loop always returns or throws above once
  // attempt >= MAX_ATTEMPTS), but keeps TypeScript happy about the return type.
  throw lastNetworkError ?? new Error("fetchAnthropicMessages: exhausted retries");
}

/** Application-level error taxonomy — never let a raw Anthropic status/body reach the UI. */
export type AiErrorCode =
  | "AI_RATE_LIMITED"
  | "AI_PROVIDER_UNAVAILABLE"
  | "AI_AUTHENTICATION_FAILED"
  | "AI_IMAGE_PROCESSING_FAILED"
  | "AI_INVALID_RESPONSE"
  | "AI_UNKNOWN_ERROR";

/** Maps an Anthropic HTTP response status (+ body, for the image-vs-other 400 split) to an AiErrorCode. */
export function classifyAnthropicStatus(status: number, bodyText: string): AiErrorCode {
  if (status === 429) return "AI_RATE_LIMITED";
  if (status === 401 || status === 403) return "AI_AUTHENTICATION_FAILED";
  if (status === 500 || status === 502 || status === 503 || status === 504 || status === 408 || status === 529) {
    return "AI_PROVIDER_UNAVAILABLE";
  }
  if (status === 400) {
    const lower = bodyText.toLowerCase();
    if (lower.includes("image") || lower.includes("media_type")) return "AI_IMAGE_PROCESSING_FAILED";
    return "AI_INVALID_RESPONSE";
  }
  return "AI_UNKNOWN_ERROR";
}

/** Short, human-readable message safe to show in the UI — never the raw provider status/body. */
export function userSafeMessage(code: AiErrorCode): string {
  switch (code) {
    case "AI_RATE_LIMITED":
    case "AI_PROVIDER_UNAVAILABLE":
      return "Card detection is busy right now — please try again in a moment.";
    case "AI_AUTHENTICATION_FAILED":
      return "Card detection is not configured correctly. Please try again later.";
    case "AI_IMAGE_PROCESSING_FAILED":
    case "AI_INVALID_RESPONSE":
    case "AI_UNKNOWN_ERROR":
      return "Card detection failed. Please try again.";
  }
}
