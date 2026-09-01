import { describe, expect, it } from "vitest";
import { normalizeSpokenNumbers } from "./normalize-spoken-numbers";

describe("normalizeSpokenNumbers", () => {
  it("replaces a trailing number-word with its digit", () => {
    expect(normalizeSpokenNumbers("fossil eight")).toBe("fossil 8");
  });

  it("replaces number-words case-insensitively", () => {
    expect(normalizeSpokenNumbers("Charizard Three")).toBe("Charizard 3");
  });

  it("leaves a query with digits already unchanged", () => {
    expect(normalizeSpokenNumbers("base set 45")).toBe("base set 45");
  });

  it("leaves a name-only query unchanged", () => {
    expect(normalizeSpokenNumbers("fossil set")).toBe("fossil set");
  });

  it("only replaces whole words, not substrings inside other words", () => {
    expect(normalizeSpokenNumbers("nineteen ninety")).toBe("19 ninety");
  });
});
