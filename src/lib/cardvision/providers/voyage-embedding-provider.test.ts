import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ImageRef } from "../types";
import { EmbeddingProviderError } from "./embedding-error";
import { createVoyageEmbeddingProvider } from "./voyage-embedding-provider";

beforeEach(() => {
  // Skip real backoff delays so retry tests run fast — same convention as reference-image-fetch.test.ts.
  vi.stubGlobal(
    "setTimeout",
    ((fn: () => void) => {
      fn();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout
  );
});

const INLINE_IMAGE: ImageRef = { kind: "inline", base64: "ZmFrZS1pbWFnZS1ieXRlcw==", mimeType: "image/png" };
const EXTERNAL_IMAGE: ImageRef = { kind: "external", url: "https://images.example.com/card.png", mimeType: "image/png" };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("createVoyageEmbeddingProvider", () => {
  it("returns null (not configured) when no API key is available, without calling fetch", async () => {
    const fetchImpl = vi.fn();
    const provider = createVoyageEmbeddingProvider({ fetchImpl });
    const result = await provider.embed(INLINE_IMAGE);
    expect(result).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("embeds an inline image, returning dims/model deterministically from the response", async () => {
    const embedding = [0.1, 0.2, 0.3, 0.4];
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { data: [{ embedding, index: 0 }], model: "voyage-multimodal-3.5" }));
    const provider = createVoyageEmbeddingProvider({ apiKey: "test-key", model: "voyage-multimodal-3.5", fetchImpl });

    const result = await provider.embed(INLINE_IMAGE, "document");

    expect(result).toEqual({ values: embedding, dims: 4, model: provider.id });
    expect(provider.id).toBe("cardvision-voyage-voyage-multimodal-3.5");

    const [, init] = fetchImpl.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("voyage-multimodal-3.5");
    expect(body.input_type).toBe("document");
    expect(body.inputs[0].content[0]).toEqual({
      type: "image_base64",
      image_base64: `data:${INLINE_IMAGE.mimeType};base64,${INLINE_IMAGE.base64}`,
    });
  });

  it("defaults role to 'query' when not specified", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { data: [{ embedding: [1], index: 0 }] }));
    const provider = createVoyageEmbeddingProvider({ apiKey: "k", fetchImpl });
    await provider.embed(INLINE_IMAGE);
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body as string);
    expect(body.input_type).toBe("query");
  });

  it("sends an external ImageRef as image_url, not base64", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { data: [{ embedding: [1, 2], index: 0 }] }));
    const provider = createVoyageEmbeddingProvider({ apiKey: "k", fetchImpl });
    await provider.embed(EXTERNAL_IMAGE, "document");
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body as string);
    expect(body.inputs[0].content[0]).toEqual({ type: "image_url", image_url: EXTERNAL_IMAGE.url });
  });

  it("sends the Authorization bearer header", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { data: [{ embedding: [1], index: 0 }] }));
    const provider = createVoyageEmbeddingProvider({ apiKey: "secret-key", fetchImpl });
    await provider.embed(INLINE_IMAGE);
    const [, init] = fetchImpl.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer secret-key");
  });

  it.each([
    [401, "EMBEDDING_AUTH_FAILED"],
    [403, "EMBEDDING_AUTH_FAILED"],
    [400, "EMBEDDING_IMAGE_INVALID"],
  ] as const)("classifies a non-retryable HTTP %i as %s", async (status, code) => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("bad request", { status }));
    const provider = createVoyageEmbeddingProvider({ apiKey: "k", fetchImpl });

    await expect(provider.embed(INLINE_IMAGE)).rejects.toMatchObject({ code, name: "EmbeddingProviderError" });
    expect(fetchImpl).toHaveBeenCalledTimes(1); // non-retryable — no retries wasted
  });

  it("classifies a persistent 429 as EMBEDDING_RATE_LIMITED, but only after exhausting retries (429 is retryable)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("rate limited", { status: 429 }));
    const provider = createVoyageEmbeddingProvider({ apiKey: "k", fetchImpl });

    await expect(provider.embed(INLINE_IMAGE)).rejects.toMatchObject({ code: "EMBEDDING_RATE_LIMITED", name: "EmbeddingProviderError" });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("retries a transient 503 then succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(jsonResponse(200, { data: [{ embedding: [1, 2, 3], index: 0 }] }));
    const provider = createVoyageEmbeddingProvider({ apiKey: "k", fetchImpl });

    const result = await provider.embed(INLINE_IMAGE);

    expect(result?.dims).toBe(3);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("throws EMBEDDING_PROVIDER_UNAVAILABLE after exhausting retries on a persistent 500", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("error", { status: 500 }));
    const provider = createVoyageEmbeddingProvider({ apiKey: "k", fetchImpl });

    await expect(provider.embed(INLINE_IMAGE)).rejects.toMatchObject({ code: "EMBEDDING_PROVIDER_UNAVAILABLE" });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("throws EMBEDDING_INVALID_RESPONSE when the response has no embedding data", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { data: [] }));
    const provider = createVoyageEmbeddingProvider({ apiKey: "k", fetchImpl });
    await expect(provider.embed(INLINE_IMAGE)).rejects.toMatchObject({ code: "EMBEDDING_INVALID_RESPONSE" });
  });

  it("throws EMBEDDING_INVALID_RESPONSE on malformed JSON", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("not json", { status: 200 }));
    const provider = createVoyageEmbeddingProvider({ apiKey: "k", fetchImpl });
    await expect(provider.embed(INLINE_IMAGE)).rejects.toMatchObject({ code: "EMBEDDING_INVALID_RESPONSE" });
  });

  it("throws EMBEDDING_DIMENSION_MISMATCH when the vector contains a non-finite value", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { data: [{ embedding: [1, Number.NaN, 3], index: 0 }] }));
    const provider = createVoyageEmbeddingProvider({ apiKey: "k", fetchImpl });
    await expect(provider.embed(INLINE_IMAGE)).rejects.toMatchObject({ code: "EMBEDDING_DIMENSION_MISMATCH" });
  });

  it("re-throws a network error (fetch rejecting) as EMBEDDING_PROVIDER_UNAVAILABLE after retries", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));
    const provider = createVoyageEmbeddingProvider({ apiKey: "k", fetchImpl });
    const error = await provider.embed(INLINE_IMAGE).catch((e) => e);
    expect(error).toBeInstanceOf(EmbeddingProviderError);
    expect(error.code).toBe("EMBEDDING_PROVIDER_UNAVAILABLE");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("uses the model override, deriving a distinct deterministic provider id", () => {
    const providerA = createVoyageEmbeddingProvider({ model: "voyage-multimodal-3.5" });
    const providerB = createVoyageEmbeddingProvider({ model: "voyage-multimodal-3" });
    expect(providerA.id).not.toBe(providerB.id);
    expect(providerA.id).toBe(createVoyageEmbeddingProvider({ model: "voyage-multimodal-3.5" }).id);
  });
});
