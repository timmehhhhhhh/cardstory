import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { identifyCardFromImage } from "./claude";

const originalKey = process.env.ANTHROPIC_API_KEY;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

function toolUseResponse(input: unknown): Response {
  return jsonResponse(200, {
    content: [{ type: "tool_use", name: "report_card_identification", input }],
  });
}

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  // Skip real backoff delays so retry tests run fast.
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

describe("identifyCardFromImage", () => {
  it("returns null immediately when ANTHROPIC_API_KEY is unset", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await identifyCardFromImage("base64data", "image/jpeg");

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("parses a successful tool_use response into ScanIdentification", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        toolUseResponse({
          game_guess: "pokemon",
          card_name: "Pikachu",
          set_name_or_symbol: "Base Set",
          card_number: "58/102",
          confidence: 0.92,
        })
      )
    );

    const result = await identifyCardFromImage("base64data", "image/jpeg");

    expect(result).toEqual({
      gameGuess: "pokemon",
      cardName: "Pikachu",
      setNameOrSymbol: "Base Set",
      cardNumber: "58/102",
      confidence: 0.92,
    });
  });

  it("defaults game_guess to 'other' when the tool reports anything but 'pokemon'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        toolUseResponse({ game_guess: "magic", card_name: "Some Card", confidence: 0.5 })
      )
    );

    const result = await identifyCardFromImage("base64data", "image/jpeg");

    expect(result?.gameGuess).toBe("other");
  });

  it("returns null without throwing when the response has no tool_use block", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { content: [{ type: "text", text: "oops" }] })));

    const result = await identifyCardFromImage("base64data", "image/jpeg");

    expect(result).toBeNull();
  });

  it("safely defaults missing/malformed tool input fields", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(toolUseResponse({})));

    const result = await identifyCardFromImage("base64data", "image/jpeg");

    expect(result).toEqual({
      gameGuess: "other",
      cardName: null,
      setNameOrSymbol: null,
      cardNumber: null,
      confidence: 0,
    });
  });

  it("retries on 429 then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(429, { error: "rate limited" }))
      .mockResolvedValueOnce(toolUseResponse({ game_guess: "pokemon", card_name: "Charizard", confidence: 0.99 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await identifyCardFromImage("base64data", "image/jpeg");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result?.cardName).toBe("Charizard");
  });

  it("retries transient 5xx/529 failures and returns null (not a throw) after exhausting retries", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(503, { error: "overloaded" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await identifyCardFromImage("base64data", "image/jpeg");

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry a permanent 401 and returns null", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(401, { error: "invalid api key" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await identifyCardFromImage("base64data", "image/jpeg");

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a thrown network error and gracefully returns null after exhausting retries", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await identifyCardFromImage("base64data", "image/jpeg");

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
