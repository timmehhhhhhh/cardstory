import type { UnifiedCard, UnifiedSet } from "@/lib/games/types";

export interface GoagainApiSetPrinting {
  initial_release_date?: string; // ISO date, or "" when undated (e.g. the evergreen "Promos" set)
  set_logo?: string | null;
}

export interface GoagainApiSet {
  id: string; // e.g. "GEM"
  name: string;
  printings: GoagainApiSetPrinting[];
}

export interface GoagainApiPrinting {
  unique_id: string; // globally unique across every printing of every card — used as our externalId
  id: string; // display collector number, e.g. "GEM088" (NOT unique: alt-art/alt-name promos can share one)
  set_id: string;
  rarity: string | null;
  foiling: string; // "S" | "C" | "R" | "G" — standard / cold foil / rainbow foil / gold cold foil
  image_url?: string | null;
  artists?: string[];
}

export interface GoagainApiCard {
  unique_id: string;
  name: string;
  type_text?: string;
  printings: GoagainApiPrinting[];
}

/**
 * FAB's official rarity letters — see fabtcg.com's rarity guide. "V" isn't
 * publicly documented but only ever appears on Convention/Hero/Judge/Promo
 * printings in this API, so it's folded into the same "Promo" label rather
 * than guessed at more specifically.
 */
const RARITY_LABELS: Record<string, string> = {
  C: "Common",
  R: "Rare",
  M: "Majestic",
  L: "Legendary",
  F: "Fabled",
  T: "Token",
  P: "Promo",
  V: "Promo",
};

// Preference order when one collector number has several foil finishes —
// picks a single representative CatalogItem per physical card face, same
// "one row per card, not per foil" convention as the Pokémon/Riftbound
// providers (foil is a price variant, not a separate catalog item here).
const FOILING_PREFERENCE = ["S", "C", "R", "G"];

export function mapFabSet(raw: GoagainApiSet): UnifiedSet {
  const printing = raw.printings[0];
  const code = raw.id.toLowerCase();
  return {
    gameId: "fab",
    externalId: raw.id,
    name: raw.name,
    code,
    releaseDate: printing?.initial_release_date ? new Date(printing.initial_release_date) : undefined,
    symbolUrl: printing?.set_logo ?? undefined,
  };
}

/**
 * goagain's `/v1/sets/{id}` embeds each card's printings across EVERY set
 * it's ever appeared in (a promo is very often a reprint of a card from a
 * main set), not just the requested one — so this filters each card down to
 * only its printing(s) in `setExternalId`, dedupes multiple foil finishes of
 * the same printing, and maps each survivor to a UnifiedCard.
 */
export function mapFabCardsForSet(cards: GoagainApiCard[], setExternalId: string): UnifiedCard[] {
  const result: UnifiedCard[] = [];
  for (const card of cards) {
    const inSet = card.printings.filter((p) => p.set_id === setExternalId);
    if (inSet.length === 0) continue;

    // Group by collector number: normally one entry, but a number can repeat
    // within the group for foil variants of the same printing OR (rarely) an
    // entirely different alternate-name/alternate-art card reusing the same
    // number — those are still distinct cards, so only collapse rows that
    // share BOTH the number and the printing's rarity+image (a real foil dupe).
    const byNumber = new Map<string, GoagainApiPrinting[]>();
    for (const p of inSet) {
      const key = `${p.id}::${p.image_url ?? ""}`;
      const group = byNumber.get(key);
      if (group) group.push(p);
      else byNumber.set(key, [p]);
    }

    for (const group of byNumber.values()) {
      const best =
        group.find((p) => p.foiling === FOILING_PREFERENCE[0]) ??
        group.slice().sort((a, b) => FOILING_PREFERENCE.indexOf(a.foiling) - FOILING_PREFERENCE.indexOf(b.foiling))[0] ??
        group[0];

      result.push({
        gameId: "fab",
        setExternalId,
        externalId: best.unique_id,
        name: card.name,
        number: best.id,
        rarity: best.rarity ? (RARITY_LABELS[best.rarity] ?? best.rarity) : undefined,
        artist: best.artists && best.artists.length > 0 ? best.artists.join(", ") : undefined,
        cardType: card.type_text,
        // `undefined`, NOT `null`, is load-bearing: seed-catalog.ts passes these
        // straight into a Prisma `update`, where undefined means "leave alone".
        // Changing it to `?? null` would wipe every image backfilled from the
        // official publisher sites (scripts/seed-card-images.ts) on the next
        // `npm run seed:catalog`.
        imageSmallUrl: best.image_url ?? undefined,
        imageLargeUrl: best.image_url ?? undefined,
        productType: "CARD",
        language: "EN",
        // goagain (and every other free FAB source) doesn't carry pricing —
        // same starting state as Riftbound, see lib/games/riftbound/mapper.ts.
        price: undefined,
      });
    }
  }
  return result;
}
