import { describe, expect, it } from "vitest";
import {
  deriveSetInitials,
  matchesNameNumberQuery,
  numbersMatch,
  parseCodeNumberQuery,
  parseDexNumberQuery,
} from "@/lib/utils/name-match";

describe("deriveSetInitials", () => {
  it("derives a fan-style short code from a set name's significant words", () => {
    expect(deriveSetInitials("Mega Evolution Promos")).toBe("MEP");
    expect(deriveSetInitials("Scarlet & Violet")).toBe("SV");
  });

  it("drops small stopwords so they don't contribute a letter", () => {
    expect(deriveSetInitials("Legends of the Arceus")).toBe("LA");
  });
});

describe("numbersMatch", () => {
  it("ignores leading zeros for purely numeric strings", () => {
    expect(numbersMatch("014", "14")).toBe(true);
    expect(numbersMatch("14", "014")).toBe(true);
    expect(numbersMatch("0014", "14")).toBe(true);
  });

  it("falls back to substring containment for non-numeric numbers", () => {
    expect(numbersMatch("SWSH001", "001")).toBe(true);
    expect(numbersMatch("14", "15")).toBe(false);
  });
});

describe("parseCodeNumberQuery", () => {
  it("parses every spacing/casing combination collectors type", () => {
    const expected = { alpha: "MEP", cardNumber: "014" };
    expect(parseCodeNumberQuery("MEP 014")).toEqual(expected);
    expect(parseCodeNumberQuery("MEP014")).toEqual(expected);
    expect(parseCodeNumberQuery("mep 014")).toEqual(expected);
  });

  it("parses the bare (unpadded) card number the same way", () => {
    const expected = { alpha: "MEP", cardNumber: "14" };
    expect(parseCodeNumberQuery("MEP14")).toEqual(expected);
    expect(parseCodeNumberQuery("MEP 14")).toEqual(expected);
  });

  it("strips a trailing EN language marker off the alpha token", () => {
    const paddedExpected = { alpha: "MEP", cardNumber: "014" };
    const bareExpected = { alpha: "MEP", cardNumber: "14" };
    expect(parseCodeNumberQuery("MEP EN 014")).toEqual(paddedExpected);
    expect(parseCodeNumberQuery("MEPEN014")).toEqual(paddedExpected);
    expect(parseCodeNumberQuery("MEP EN 14")).toEqual(bareExpected);
    expect(parseCodeNumberQuery("MEPEN14")).toEqual(bareExpected);
  });

  it("returns null for queries that aren't shaped like a code + number", () => {
    expect(parseCodeNumberQuery("Ceruledge")).toBeNull();
    expect(parseCodeNumberQuery("014")).toBeNull();
    expect(parseCodeNumberQuery("Ceruledge Promo")).toBeNull();
  });
});

describe("parseDexNumberQuery", () => {
  it("parses a Pokédex number + card number, padded or not", () => {
    expect(parseDexNumberQuery("937 014")).toEqual({ dexNumber: 937, cardNumber: "014" });
    expect(parseDexNumberQuery("937 14")).toEqual({ dexNumber: 937, cardNumber: "14" });
    expect(parseDexNumberQuery("0937 014")).toEqual({ dexNumber: 937, cardNumber: "014" });
    expect(parseDexNumberQuery("0937 14")).toEqual({ dexNumber: 937, cardNumber: "14" });
  });

  it("parses a set code + Pokédex number with no card number", () => {
    expect(parseDexNumberQuery("MEP 937")).toEqual({ alpha: "MEP", dexNumber: 937 });
  });

  it("returns null for anything else", () => {
    expect(parseDexNumberQuery("Ceruledge")).toBeNull();
    expect(parseDexNumberQuery("Ceruledge Promo")).toBeNull();
    expect(parseDexNumberQuery("937")).toBeNull();
  });
});

describe("matchesNameNumberQuery", () => {
  const ceruledge = {
    name: "Ceruledge ex",
    nameEn: null,
    number: "014",
    setName: "Mega Evolution Promos",
    setNameEn: null,
    setCode: "me2.5-p",
    nationalPokedexNumbers: [937],
  };

  it("matches a hyphenated name with a space, regardless of case", () => {
    const card = { name: "Pikachu-EX", nameEn: null, number: "054" };
    expect(matchesNameNumberQuery("Pikachu EX", card)).toBe(true);
    expect(matchesNameNumberQuery("pikachu ex", card)).toBe(true);
    expect(matchesNameNumberQuery("Pikachu-EX", card)).toBe(true);
  });

  it("matches every short-form set-code + number query shape", () => {
    for (const q of [
      "MEP 014",
      "MEP014",
      "MEP14",
      "MEP 14",
      "MEP EN 014",
      "MEPEN014",
      "MEP EN 14",
      "MEPEN14",
    ]) {
      expect(matchesNameNumberQuery(q, ceruledge)).toBe(true);
    }
  });

  it("matches every Pokédex-number query shape", () => {
    for (const q of ["937 014", "MEP 937", "937 14", "0937 014", "0937 14"]) {
      expect(matchesNameNumberQuery(q, ceruledge)).toBe(true);
    }
  });

  it("matches a name + set word query, case-insensitively", () => {
    expect(matchesNameNumberQuery("Ceruledge Promo", ceruledge)).toBe(true);
    expect(matchesNameNumberQuery("ceruledge promo", ceruledge)).toBe(true);
  });

  it("doesn't match an unrelated card", () => {
    const other = { name: "Pikachu-EX", nameEn: null, number: "054", nationalPokedexNumbers: [25] };
    expect(matchesNameNumberQuery("MEP 014", other)).toBe(false);
    expect(matchesNameNumberQuery("937 014", other)).toBe(false);
  });
});
