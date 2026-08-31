/**
 * Curated set -> named-collector-pattern overlay.
 *
 * pokemontcg.io (and the TCGplayer pricing feed it mirrors) only prices a
 * small, generic set of finish SKUs — "holofoil", "reverseHolofoil",
 * "1stEditionHolofoil", etc. (see mapper.ts's FINISH_LABELS). It does NOT
 * expose finer collector names for the actual foil *texture* a given set
 * used — e.g. "Cosmos Holo" or "Cracked Ice Holo" are never distinct SKUs
 * in the data, only ever folded into one of the generic finish buckets
 * above. Verified live against the API: Legendary Collection (set id
 * "base6"), the set collectors know for its "Cracked Ice Holo" reverse
 * holos, is priced purely as generic `reverseHolofoil` — no separate
 * "Cracked Ice" key exists anywhere in the provider response.
 *
 * This table lets Explore/the card detail page label a specific
 * (setExternalId, variantKey) pair with its real collector name where one
 * is well-documented, layered on top of the generic finish name — purely a
 * display overlay, resolved at READ TIME (see getFinishDisplayLabel below),
 * never baked into a stored CatalogItem row. That means an entry here can
 * be corrected or extended at any time without a catalog re-seed.
 *
 * Deliberately tiny. Only add an entry you can independently verify — an
 * unconfirmed guess at 30 years of Pokémon foil-pattern history is worse
 * than just showing the generic finish name. Broader historical coverage
 * (Team Rocket-era "cosmos" reverse holos, etc.) is intentionally a
 * follow-up, not part of this initial table.
 *
 * "Cosmos Holo" itself did NOT go through this table — it needed its own
 * Explore filter entry (not just a per-tile display name), which this
 * read-time overlay deliberately can't provide (see getDistinctVariants in
 * lib/catalog/search.ts). Instead, TCGCollector-verified Cosmos Holo cards
 * have their `variantKey` itself rewritten from "reverseHolofoil" to
 * "cosmosHolo" at import time — see scripts/crawl-tcgcollector-cosmos-holo.ts
 * and scripts/apply-cosmos-holo-variant.ts.
 */
const FINISH_PATTERNS: Record<string, Record<string, string>> = {
  // Legendary Collection (2002) — every reverseHolofoil print in this set
  // uses the distinctive crackled-glass "Cracked Ice Holo" foil pattern,
  // unique to this set at the time. Source: pokemontcg.io set id "base6".
  base6: { reverseHolofoil: "Cracked Ice Holo" },
  // Plasma Storm (2013, Black & White era) — every reverseHolofoil print in
  // this set uses the same crackled-glass "Cracked Ice Holo" foil pattern.
  // Source: pokemontcg.io set id "bw8"; verified against PriceCharting's own
  // listing (pricecharting.com/game/pokemon-plasma-storm/giratina-cracked-ice-holo-62)
  // and matching eBay listings, both naming this exact print "Cracked Ice Holo".
  bw8: { reverseHolofoil: "Cracked Ice Holo" },
};

/**
 * Resolves the display label for one card's finish: the curated pattern
 * name if this exact (set, finish) pair has one, otherwise `defaultLabel`
 * (the generic finish name, e.g. "Reverse Holo" — see mapper.ts).
 */
export function getFinishDisplayLabel(
  setExternalId: string | null | undefined,
  variantKey: string | null | undefined,
  defaultLabel: string
): string {
  if (!setExternalId || !variantKey) return defaultLabel;
  return FINISH_PATTERNS[setExternalId]?.[variantKey] ?? defaultLabel;
}
