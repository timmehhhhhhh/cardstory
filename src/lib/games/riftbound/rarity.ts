/**
 * Riftbound's real `classification.rarity` vocabulary, verified against
 * riftcodex.com's live API across every set (OGN, OGS, PR, OPP, JDG, VEN,
 * SFD, UNL): only these 6 values are ever returned. "Champion" is not a
 * rarity — it's a separate `classification.supertype` (see card-types.ts)
 * that can combine with any of these 6 tiers, not a 7th tier of its own.
 *
 * Used only to rank Explore's rarity filter list in tier order instead of
 * alphabetically (see lib/catalog/search.ts#getDistinctRarities) — not to
 * validate/reject values. A future set introducing a new rarity string
 * would still show up in the filter, just sorted alphabetically after the
 * known tiers, same defensive posture as cardTypeLabel()'s doc comment.
 */
export const RIFTBOUND_RARITY_ORDER = ["Common", "Uncommon", "Rare", "Epic", "Showcase", "Promo"];

/**
 * Display-only relabeling — the community/official term for the API's
 * "Showcase" tier is "Alternate Art" (special alternate-artwork printings,
 * e.g. "120a/221" — see numbering.ts). The stored/filtered/sorted value
 * stays "Showcase" everywhere (RIFTBOUND_RARITY_ORDER, DB rows, URL params);
 * only user-facing text (RarityBadge, sidebar filter labels) reads this map.
 */
export const RIFTBOUND_RARITY_LABEL: Record<string, string> = {
  Showcase: "Alternate Art",
};
