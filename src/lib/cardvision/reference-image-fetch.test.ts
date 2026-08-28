import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchImageBytes, isValidImageUrl } from "./reference-image-fetch";

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function pngBytes(payload = "fake-image-bytes-long-enough"): Uint8Array {
  const body = new TextEncoder().encode(payload);
  const combined = new Uint8Array(PNG_HEADER.length + body.length);
  combined.set(PNG_HEADER, 0);
  combined.set(body, PNG_HEADER.length);
  return combined;
}

function imageResponse(bytes: Uint8Array, contentType = "image/png", status = 200): Response {
  return new Response(bytes as BodyInit, { status, headers: { "content-type": contentType } });
}

beforeEach(() => {
  vi.stubGlobal(
    "setTimeout",
    ((fn: () => void) => {
      fn();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("isValidImageUrl", () => {
  it("accepts http/https URLs", () => {
    expect(isValidImageUrl("https://images.example/a.png")).toBe(true);
    expect(isValidImageUrl("http://images.example/a.png")).toBe(true);
  });

  it("rejects malformed or non-http(s) URLs", () => {
    expect(isValidImageUrl("not-a-url")).toBe(false);
    expect(isValidImageUrl("ftp://images.example/a.png")).toBe(false);
    expect(isValidImageUrl("")).toBe(false);
  });
});

describe("fetchImageBytes", () => {
  it("returns invalid without fetching for a malformed URL", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchImageBytes("not-a-url");

    expect(result).toEqual({ kind: "invalid", reason: "malformed or non-http(s) URL" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("classifies a valid PNG response as ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(imageResponse(pngBytes())));

    const result = await fetchImageBytes("https://images.example/a.png");

    expect(result.kind).toBe("ok");
    if (result.kind === "ok") expect(result.contentType).toBe("image/png");
  });

  it("classifies a wrong content-type as invalid", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(imageResponse(pngBytes(), "text/html")));

    const result = await fetchImageBytes("https://images.example/a.png");

    expect(result).toMatchObject({ kind: "invalid" });
  });

  it("classifies an empty body as invalid", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new Uint8Array(), { status: 200, headers: { "content-type": "image/png" } })));

    const result = await fetchImageBytes("https://images.example/a.png");

    expect(result).toMatchObject({ kind: "invalid", reason: "empty response body" });
  });

  it("classifies bytes that don't match a known image signature as invalid", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(imageResponse(new TextEncoder().encode("not actually an image"))));

    const result = await fetchImageBytes("https://images.example/a.png");

    expect(result).toMatchObject({ kind: "invalid", reason: "response body is not a recognized image format" });
  });

  it("retries a retryable 5xx then succeeds", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("busy", { status: 503 })).mockResolvedValueOnce(imageResponse(pngBytes()));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchImageBytes("https://images.example/a.png");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.kind).toBe("ok");
  });

  it("does not retry a non-retryable 404", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("nope", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchImageBytes("https://images.example/a.png");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ kind: "invalid", reason: "HTTP 404" });
  });

  it("retries a persistent 503 and fails after exhausting retries", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("busy", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchImageBytes("https://images.example/a.png");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ kind: "failed", reason: "HTTP 503" });
  });

  it("retries a thrown network error and fails gracefully after exhausting retries", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchImageBytes("https://images.example/a.png");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ kind: "failed", reason: "fetch failed" });
  });

  it("classifies an abort/timeout as a timeout failure", async () => {
    const fetchMock = vi.fn().mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchImageBytes("https://images.example/a.png");

    expect(result).toMatchObject({ kind: "failed", reason: "timeout" });
  });
});
