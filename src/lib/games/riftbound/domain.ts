/**
 * Riftbound's `classification.domain` vocabulary, verified against
 * riftcodex.com's live `GET /index/domains` — exactly these 7 values are
 * ever returned. A card can belong to one domain (most Units/Spells/Gear)
 * or two (dual-domain Legends, e.g. Jax's ["Calm","Body"]) — see
 * CatalogItem.domain, a Postgres string array.
 *
 * Order here is the pairing the game itself documents (each domain's
 * thematic opposite sits next to it: Fury/Calm, Mind/Body, Chaos/Order),
 * with the domain-less "Colorless" tier last — used to rank Explore's
 * Domain filter/sort instead of leaving it alphabetical, same defensive
 * posture as RIFTBOUND_RARITY_ORDER (an unranked future value would just
 * sort alphabetically after these).
 */
export const RIFTBOUND_DOMAIN_ORDER = [
  "Fury",
  "Calm",
  "Mind",
  "Body",
  "Chaos",
  "Order",
  "Colorless",
];

/** Each domain's brand color, for `<DomainIcon>` — see components/cards/riftbound-icons.tsx. */
export const RIFTBOUND_DOMAIN_COLOR: Record<string, string> = {
  Fury: "#e2483d",
  Calm: "#3aa76d",
  Mind: "#3b82f6",
  Body: "#e08a2b",
  Chaos: "#a855f7",
  Order: "#d4af37",
  Colorless: "#9ca3af",
};
