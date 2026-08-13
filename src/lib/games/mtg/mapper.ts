import type { UnifiedCard, UnifiedSet } from "@/lib/games/types";

export interface ScryfallSet {
  id: string;
  code: string;
  name: string;
  released_at?: string;
  set_type: string;
  card_count?: number;
  icon_svg_uri?: string;
}

interface ScryfallImageUris {
  small?: string;
  large?: string;
}

export interface ScryfallCard {
  id: string;
  name: string;
  collector_number?: string;
  rarity?: string;
  lang?: string;
  image_uris?: ScryfallImageUris;
  card_faces?: { image_uris?: ScryfallImageUris }[];
  prices?: { usd?: string | null; usd_foil?: string | null };
}

/** Only "real product" set types — excludes tokens, memorabilia, art series, etc. */
export const SCRYFALL_SEEDABLE_SET_TYPES = new Set([
  "expansion",
  "core",
  "masters",
  "draft_innovation",
  "commander",
]);

export function mapScryfallSet(raw: ScryfallSet): UnifiedSet {
  return {
    gameId: "mtg",
    externalId: raw.code,
    name: raw.name,
    code: raw.code,
    releaseDate: raw.released_at ? new Date(raw.released_at) : undefined,
    symbolUrl: raw.icon_svg_uri,
    cardCount: raw.card_count,
  };
}

export function mapScryfallCard(raw: ScryfallCard, setExternalId: string): UnifiedCard {
  const images = raw.image_uris ?? raw.card_faces?.[0]?.image_uris;
  const usd = raw.prices?.usd ? Number(raw.prices.usd) : undefined;
  const usdFoil = raw.prices?.usd_foil ? Number(raw.prices.usd_foil) : undefined;

  return {
    gameId: "mtg",
    setExternalId,
    externalId: raw.id,
    name: raw.name,
    number: raw.collector_number,
    rarity: raw.rarity,
    imageSmallUrl: images?.small,
    imageLargeUrl: images?.large,
    productType: "CARD",
    language: (raw.lang ?? "en").toUpperCase(),
    price:
      usd == null && usdFoil == null
        ? undefined
        : { raw: usd, foil: usdFoil, currency: "USD", source: "scryfall" },
  };
}
