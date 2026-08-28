/**
 * Error taxonomy for a real (non-null) VisionEmbeddingProvider — mirrors
 * src/lib/scan/ai-provider.ts's AiErrorCode/classifyAnthropicStatus pattern
 * (a small closed set of causes, never a raw provider status/body leaking
 * further up the stack) but kept generic to any embedding provider, not
 * Voyage-specific, so a future second VisionEmbeddingProvider implementation
 * reuses this same class/codes instead of inventing its own.
 *
 * See providers/types.ts's VisionEmbeddingProvider.embed() doc comment for
 * the contract this supports: null means "not configured" (expected,
 * non-error); everything else throws one of these.
 */
export type EmbeddingErrorCode =
  | "EMBEDDING_RATE_LIMITED"
  | "EMBEDDING_PROVIDER_UNAVAILABLE"
  | "EMBEDDING_AUTH_FAILED"
  | "EMBEDDING_IMAGE_INVALID"
  | "EMBEDDING_DIMENSION_MISMATCH"
  | "EMBEDDING_INVALID_RESPONSE"
  | "EMBEDDING_UNKNOWN_ERROR";

export class EmbeddingProviderError extends Error {
  readonly code: EmbeddingErrorCode;
  /** Which provider raised this — e.g. "cardvision-voyage-multimodal-3.5" — for logging/telemetry, never surfaced to end users. */
  readonly providerId: string;

  constructor(code: EmbeddingErrorCode, providerId: string, message: string) {
    super(message);
    this.name = "EmbeddingProviderError";
    this.code = code;
    this.providerId = providerId;
  }
}

// Same retryable-status set as fetchAnthropicMessages/fetchImageBytes: 429
// rate limited, 500/502/503/504 server errors, 408 request timeout, 529
// Anthropic-family "overloaded" status (Voyage uses the same conventional
// HTTP status codes for these conditions).
export const RETRYABLE_EMBEDDING_STATUSES = new Set([429, 500, 502, 503, 504, 408, 529]);

/** Maps an embedding API's HTTP response status to an EmbeddingErrorCode — used once a call has exhausted its retries (see voyage-embedding-provider.ts). */
export function classifyEmbeddingHttpStatus(status: number): EmbeddingErrorCode {
  if (status === 429) return "EMBEDDING_RATE_LIMITED";
  if (status === 401 || status === 403) return "EMBEDDING_AUTH_FAILED";
  if (RETRYABLE_EMBEDDING_STATUSES.has(status)) return "EMBEDDING_PROVIDER_UNAVAILABLE";
  if (status === 400 || status === 422) return "EMBEDDING_IMAGE_INVALID";
  return "EMBEDDING_UNKNOWN_ERROR";
}
