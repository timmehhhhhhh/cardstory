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
