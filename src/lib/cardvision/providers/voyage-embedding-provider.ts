/**
 * The first real (non-null) VisionEmbeddingProvider — Voyage AI's
 * multimodal embeddings API (https://docs.voyageai.com), called via raw
 * `fetch` rather than the @voyageai SDK, same rationale as
 * src/lib/scan/ai-provider.ts's Anthropic calls: this app deploys to
 * Cloudflare Workers under a 3 MiB bundle cap, and a single JSON
 * request/response call needs nothing an SDK provides beyond auth headers.
 *
 * Deliberately just ONE implementation of providers/types.ts's
 * VisionEmbeddingProvider interface — nothing in ./embedding-index.ts,
 * ./embedding-similarity-retriever.ts, or recognizer.ts imports this file
 * directly except config.ts's opt-in wiring; a future second provider
 * (a local encoder, a different hosted API, a fine-tuned model) is a
 * sibling file implementing the same interface, not a change here.
 */
import type { ImageRef } from "../types";
import { EmbeddingProviderError, classifyEmbeddingHttpStatus, RETRYABLE_EMBEDDING_STATUSES } from "./embedding-error";
import type { EmbeddingRole, EmbeddingVector, VisionEmbeddingProvider } from "./types";

const VOYAGE_API_URL = "https://api.voyageai.com/v1/multimodalembeddings";

/** Default model — overridable via VOYAGE_MODEL for evaluating a newer/cheaper Voyage model without a code change (docs/cardvision.md's "future model/version changes" requirement). */
const DEFAULT_MODEL = "voyage-multimodal-3.5";

// Same retry shape as reference-image-fetch.ts's fetchImageBytes — that
// file's header comment documents why this app duplicates retry boilerplate
// per call site rather than sharing it across unrelated concerns.
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 500;

type VoyageContentPart =
  | { type: "image_base64"; image_base64: string }
  | { type: "image_url"; image_url: string };

interface VoyageRequestBody {
  model: string;
  input_type: EmbeddingRole;
  inputs: { content: VoyageContentPart[] }[];
}

interface VoyageResponseBody {
  data?: { embedding: number[]; index: number }[];
  model?: string;
}

function toContentPart(image: ImageRef): VoyageContentPart {
  if (image.kind === "inline") {
    return { type: "image_base64", image_base64: `data:${image.mimeType};base64,${image.base64}` };
  }
  return { type: "image_url", image_url: image.url };
}

export interface VoyageEmbeddingProviderOptions {
  apiKey?: string;
  model?: string;
  /** Injectable for tests — defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

/**
 * Retry-wrapped POST to Voyage's multimodal-embeddings endpoint. Retries
 * both retryable HTTP statuses and thrown network errors, mirroring
 * src/lib/scan/ai-provider.ts's fetchAnthropicMessages exactly (same
 * statuses, same attempt count, same exponential-backoff-with-jitter
 * formula) — kept as a local function here rather than imported from that
 * Anthropic-specific file, same convention reference-image-fetch.ts
 * documents for its own retry loop.
 */
async function postWithRetry(fetchImpl: typeof fetch, body: string, apiKey: string): Promise<Response> {
  let lastNetworkError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetchImpl(VOYAGE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body,
      });

      if (res.ok || !RETRYABLE_EMBEDDING_STATUSES.has(res.status) || attempt >= MAX_ATTEMPTS) return res;
      lastNetworkError = undefined;
    } catch (err) {
      lastNetworkError = err;
      if (attempt >= MAX_ATTEMPTS) throw err;
    }

    const delayMs = BASE_DELAY_MS * 2 ** (attempt - 1) + Math.random() * 250;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw lastNetworkError ?? new Error("voyage-embedding-provider: exhausted retries");
}

/**
 * Factory (not a singleton export) so tests can inject `apiKey`/`fetchImpl`
 * without mutating process.env — same pattern as recognizer.ts's
 * createCardVisionRecognizer(overrides). config.ts's
 * getDefaultCardVisionRecognizer() is the one place process.env is read for
 * production use.
 */
export function createVoyageEmbeddingProvider(options: VoyageEmbeddingProviderOptions = {}): VisionEmbeddingProvider {
  const model = options.model ?? process.env.VOYAGE_MODEL ?? DEFAULT_MODEL;
  const fetchImpl = options.fetchImpl ?? fetch;
  const providerId = `cardvision-voyage-${model}`;

  return {
    id: providerId,

    async embed(image: ImageRef, role: EmbeddingRole = "query"): Promise<EmbeddingVector | null> {
      const apiKey = options.apiKey ?? process.env.VOYAGE_API_KEY;
      // Not configured — expected, deterministic "no embedding available",
      // never an error. See providers/types.ts's embed() doc comment.
      if (!apiKey) return null;

      const requestBody: VoyageRequestBody = {
        model,
        input_type: role,
        inputs: [{ content: [toContentPart(image)] }],
      };

      let res: Response;
      try {
        res = await postWithRetry(fetchImpl, JSON.stringify(requestBody), apiKey);
      } catch (err) {
        throw new EmbeddingProviderError(
          "EMBEDDING_PROVIDER_UNAVAILABLE",
          providerId,
          err instanceof Error ? err.message : "Voyage embedding request failed"
        );
      }

      if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        throw new EmbeddingProviderError(
          classifyEmbeddingHttpStatus(res.status),
          providerId,
          `Voyage embeddings API returned HTTP ${res.status}${bodyText ? `: ${bodyText.slice(0, 200)}` : ""}`
        );
      }

      let parsed: VoyageResponseBody;
      try {
        parsed = (await res.json()) as VoyageResponseBody;
      } catch {
        throw new EmbeddingProviderError("EMBEDDING_INVALID_RESPONSE", providerId, "Voyage embeddings API returned invalid JSON");
      }

      const values = parsed.data?.[0]?.embedding;
      if (!values || values.length === 0) {
        throw new EmbeddingProviderError("EMBEDDING_INVALID_RESPONSE", providerId, "Voyage embeddings API returned no embedding data");
      }

      // Dimensionality is read from the actual returned array — never
      // hard-coded — but is still validated: every value must be a finite
      // number, otherwise a partially-malformed response would silently
      // corrupt everything downstream that trusts EmbeddingVector.dims.
      if (!values.every((v) => typeof v === "number" && Number.isFinite(v))) {
        throw new EmbeddingProviderError(
          "EMBEDDING_DIMENSION_MISMATCH",
          providerId,
          "Voyage embeddings API returned a non-numeric or non-finite vector"
        );
      }

      // `model` is set to this provider's own `id` (not a separately-invented
      // string) so EmbeddingVector.model, CardReferenceEmbedding.provider,
      // and VisionEmbeddingProvider.id are always the exact same identity —
      // one deterministic string a retriever/persistence layer compares
      // against, never three that could drift apart.
      return { values, dims: values.length, model: providerId };
    },
  };
}
