import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClaudeCardDetector } from "./claude-detector";
import type { DetectionInput } from "./types";

const originalKey = process.env.ANTHROPIC_API_KEY;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

function toolUseResponse(input: unknown): Response {
  return jsonResponse(200, {
    content: [{ type: "tool_use", name: "report_card_detections", input }],
  });
}

const inlineInput: DetectionInput = {
  image: { kind: "inline", base64: "base64data", mimeType: "image/jpeg" },
};

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = "test-key";
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
  if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = originalKey;
});

describe("createClaudeCardDetector", () => {
  it("returns null when ANTHROPIC_API_KEY is unset", () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(createClaudeCardDetector()).toBeNull();
  });

  it("has id 'claude-multi-region'", () => {
    expect(createClaudeCardDetector()?.id).toBe("claude-multi-region");
  });
});

describe("claude-multi-region detector.detect", () => {
  it("converts x_min/y_min/x_max/y_max boxes into {x,y,width,height} in [0,1]", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        toolUseResponse({
          detections: [
            { box: { x_min: 100, y_min: 200, x_max: 400, y_max: 800 }, confidence: 0.87 },
          ],
        })
      )
    );

    const regions = await createClaudeCardDetector()!.detect(inlineInput);

    expect(regions).toEqual([
      { box: { x: 0.1, y: 0.2, width: 0.3, height: 0.6 }, confidence: 0.87 },
    ]);
  });

  it("returns [] when detections is an empty array", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(toolUseResponse({ detections: [] })));

    const regions = await createClaudeCardDetector()!.detect(inlineInput);

    expect(regions).toEqual([]);
  });

  it("retries on 429/503 then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(429, { error: "rate limited" }))
      .mockResolvedValueOnce(jsonResponse(503, { error: "overloaded" }))
      .mockResolvedValueOnce(
        toolUseResponse({ detections: [{ box: { x_min: 0, y_min: 0, x_max: 1000, y_max: 1000 }, confidence: 1 }] })
      );
    vi.stubGlobal("fetch", fetchMock);

    const regions = await createClaudeCardDetector()!.detect(inlineInput);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(regions).toHaveLength(1);
  });

  it("throws the exact user-safe message for a permanent 4xx failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(400, { error: "bad request" })));

    await expect(createClaudeCardDetector()!.detect(inlineInput)).rejects.toThrow(
      "Card detection failed. Please try again."
    );
  });

  it("throws a distinct message for an authentication failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401, { error: "invalid api key" })));

    await expect(createClaudeCardDetector()!.detect(inlineInput)).rejects.toThrow(
      "Card detection is not configured correctly. Please try again later."
    );
  });

  it("throws the busy-retry message once retries are exhausted on a retryable status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(529, { error: "overloaded" })));

    await expect(createClaudeCardDetector()!.detect(inlineInput)).rejects.toThrow(
      "Card detection is busy right now — please try again in a moment."
    );
  });

  it("throws for a non-inline ImageRef without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createClaudeCardDetector()!.detect({ image: { kind: "external", url: "https://example.com/x.jpg", mimeType: "image/jpeg" } })
    ).rejects.toThrow("claude-multi-region detector requires an inline ImageRef");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
