import type { UnifiedCard, UnifiedSet } from "@/lib/games/types";
import { cardTypeLabel } from "@/lib/games/riftbound/card-types";
import { classifyRiftboundNumbering, parseRiftboundNumber } from "@/lib/games/riftbound/numbering";

export interface RiftcodexApiSet {
  set_id: string;
  name: string;
  card_count?: number;
  published_on?: string; // ISO date
}

export interface RiftcodexApiCard {
  riftbound_id: string; // e.g. "ogn-205a-298" — unique per printing, incl. alternate art
  name: string;
  collector_number?: number;
  classification: {
    type: string; // "Unit" | "Spell" | "Gear" | "Rune" | "Battlefield" | "Legend"
    supertype: string | null; // "Champion" | "Signature" | "Basic" | "Token" | null
    rarity: string | null;
    domain: string[]; // "Fury" | "Calm" | "Mind" | "Body" | "Chaos" | "Order" | "Colorless", one or two entries
  };
  media?: {
    image_url?: string | null;
  };
  set: {
    set_id: string;
  };
}

export function mapRiftboundSet(raw: RiftcodexApiSet): UnifiedSet {
  const code = raw.set_id.toLowerCase();
  return {
    gameId: "riftbound",
    externalId: code,
    name: raw.name,
    code,
    releaseDate: raw.published_on ? new Date(raw.published_on) : undefined,
    cardCount: raw.card_count,
  };
}

export function mapRiftboundCard(raw: RiftcodexApiCard, setExternalId: string): UnifiedCard {
  const rawRarity = raw.classification.rarity ?? undefined;
  // Rare is reserved for standard prints. A card's printed number is
  // independent of its API rarity, so an alt-art or overnumbered variant can
  // come back as "Rare" from riftcodex.com — reclassify those to Showcase
  // (displayed as "Alternate Art", see rarity.ts/riftbound-icons.tsx) so
  // they read, filter, and sort as the special printing they actually are.
  const { isAlternateArt, isOvernumbered } = classifyRiftboundNumbering(raw.riftbound_id);
  const rarity =
    rawRarity === "Rare" && (isAlternateArt || isOvernumbered) ? "Showcase" : rawRarity;
  return {
    gameId: "riftbound",
    setExternalId,
    externalId: raw.riftbound_id,
    name: raw.name,
    number: parseRiftboundNumber(raw.riftbound_id),
    rarity,
    cardType: cardTypeLabel(raw.classification.type, raw.classification.supertype),
    domain: raw.classification.domain ?? [],
    imageSmallUrl: raw.media?.image_url ?? undefined,
    imageLargeUrl: raw.media?.image_url ?? undefined,
    productType: "CARD",
    language: "EN",
    // riftcodex.com doesn't expose pricing — no free/ToS-safe Riftbound price
    // source exists yet, same starting state sports cards have (see
    // SportsCardItem in prisma/schema.prisma). Graded-price lookups on the
    // card detail page still work via the existing generic PriceCharting
    // on-demand path (lib/pricing/graded.ts) once/if it lists Riftbound.
    price: undefined,
  };
}
