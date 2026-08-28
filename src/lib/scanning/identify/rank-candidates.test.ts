import { describe, expect, it } from "vitest";
import { rankCatalogItems } from "./rank-candidates";
import type { CatalogSearchItem } from "@/lib/catalog/search";

function item(overrides: Partial<CatalogSearchItem> & { id: string; name: string }): CatalogSearchItem {
  return {
    gameId: "pokemon",
    externalId: overrides.id,
    nameEn: null,
    number: null,
    rarity: null,
    artist: null,
    cardType: null,
    domain: [],
    nationalPokedexNumbers: [],
    language: "EN",
    variantKey: null,
    variantLabel: null,
    imageSmallUrl: null,
    setName: "Base Set",
    setNameEn: null,
    releaseDate: null,
    productType: "CARD",
    priceRaw: null,
    priceChangePct: null,
    hasPrice: false,
    ...overrides,
  };
}

describe("rankCatalogItems", () => {
  it("ranks an exact name match above a fuzzy/partial one", () => {
    const pool = [
      item({ id: "pokemon:1", name: "Blastoise" }),
      item({ id: "pokemon:2", name: "Charizard" }),
    ];
    const results = rankCatalogItems(pool, { cardName: "Charizard" });
    expect(results[0]?.catalogItemId).toBe("pokemon:2");
  });

  it("boosts a candidate whose number matches the queried cardNumber over one that doesn't, at equal name similarity", () => {
    const pool = [
      item({ id: "pokemon:1", name: "Pikachu", number: "025/102" }),
      item({ id: "pokemon:2", name: "Pikachu", number: "058/102" }),
    ];
    const results = rankCatalogItems(pool, { cardName: "Pikachu", cardNumber: "025/102" });
    expect(results[0]?.catalogItemId).toBe("pokemon:1");
  });

  it("respects limit, returning at most that many candidates", () => {
    const pool = Array.from({ length: 10 }, (_, i) => item({ id: `pokemon:${i}`, name: "Eevee" }));
    const results = rankCatalogItems(pool, { cardName: "Eevee" }, 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("returns an empty array when the pool has no plausible match", () => {
    const pool = [item({ id: "pokemon:1", name: "Blastoise" })];
    const results = rankCatalogItems(pool, { cardName: "Zzyzx Nonexistent Card Name" });
    expect(results).toEqual([]);
  });

  it("boosts a candidate whose set name matches the queried setNameOrSymbol, disambiguating a reprint across sets", () => {
    const pool = [
      item({ id: "pokemon:1", name: "Pikachu", setName: "Base Set" }),
      item({ id: "pokemon:2", name: "Pikachu", setName: "Jungle" }),
    ];
    const results = rankCatalogItems(pool, { cardName: "Pikachu", setNameOrSymbol: "Jungle" });
    expect(results[0]?.catalogItemId).toBe("pokemon:2");
  });

  it("dedupes an item appearing twice in the input pool", () => {
    const duplicated = item({ id: "pokemon:1", name: "Charizard" });
    const pool = [duplicated, duplicated];
    const results = rankCatalogItems(pool, { cardName: "Charizard" });
    const ids = results.map((r) => r.catalogItemId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
