import type { UnifiedCard, UnifiedSet } from "@/lib/games/types";
import { cardTypeLabel } from "@/lib/games/riftbound/card-types";

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
  return {
    gameId: "riftbound",
    setExternalId,
    externalId: raw.riftbound_id,
    name: raw.name,
    number: raw.collector_number != null ? String(raw.collector_number) : undefined,
    rarity: raw.classification.rarity ?? undefined,
    cardType: cardTypeLabel(raw.classification.type, raw.classification.supertype),
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
