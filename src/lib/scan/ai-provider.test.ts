import { describe, expect, it } from "vitest";
import { classifyAnthropicStatus, userSafeMessage, type AiErrorCode } from "./ai-provider";

describe("classifyAnthropicStatus", () => {
  it("maps 429 to AI_RATE_LIMITED", () => {
    expect(classifyAnthropicStatus(429, "")).toBe("AI_RATE_LIMITED");
  });

  it("maps 401 and 403 to AI_AUTHENTICATION_FAILED", () => {
    expect(classifyAnthropicStatus(401, "")).toBe("AI_AUTHENTICATION_FAILED");
    expect(classifyAnthropicStatus(403, "")).toBe("AI_AUTHENTICATION_FAILED");
  });

  it("maps 500/502/503/504/408/529 to AI_PROVIDER_UNAVAILABLE", () => {
    for (const status of [500, 502, 503, 504, 408, 529]) {
      expect(classifyAnthropicStatus(status, "")).toBe("AI_PROVIDER_UNAVAILABLE");
    }
  });

  it("maps a 400 mentioning image/media_type to AI_IMAGE_PROCESSING_FAILED", () => {
    expect(classifyAnthropicStatus(400, '{"error":"invalid media_type"}')).toBe("AI_IMAGE_PROCESSING_FAILED");
    expect(classifyAnthropicStatus(400, '{"error":"could not process image"}')).toBe("AI_IMAGE_PROCESSING_FAILED");
  });

  it("maps a non-image 400 to AI_INVALID_RESPONSE", () => {
    expect(classifyAnthropicStatus(400, '{"error":"missing required field"}')).toBe("AI_INVALID_RESPONSE");
  });

  it("maps anything else (e.g. 404) to AI_UNKNOWN_ERROR", () => {
    expect(classifyAnthropicStatus(404, "")).toBe("AI_UNKNOWN_ERROR");
  });
});

describe("userSafeMessage", () => {
  const codes: AiErrorCode[] = [
    "AI_RATE_LIMITED",
    "AI_PROVIDER_UNAVAILABLE",
    "AI_AUTHENTICATION_FAILED",
    "AI_IMAGE_PROCESSING_FAILED",
    "AI_INVALID_RESPONSE",
    "AI_UNKNOWN_ERROR",
  ];

  it("returns a non-empty, provider-neutral message for every error code", () => {
    for (const code of codes) {
      const message = userSafeMessage(code);
      expect(message.length).toBeGreaterThan(0);
      expect(message.toLowerCase()).not.toContain("anthropic");
      expect(message.toLowerCase()).not.toContain("claude");
    }
  });

  it("gives auth failures a distinct message from generic retryable failures", () => {
    expect(userSafeMessage("AI_AUTHENTICATION_FAILED")).not.toBe(userSafeMessage("AI_RATE_LIMITED"));
  });
});
