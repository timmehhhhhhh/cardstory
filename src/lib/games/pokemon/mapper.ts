import type { UnifiedCard, UnifiedSet } from "@/lib/games/types";

export interface PokemonApiSet {
  id: string;
  name: string;
  series: string;
  printedTotal?: number;
  total?: number;
  releaseDate?: string; // "YYYY/MM/DD"
  images?: { symbol?: string; logo?: string };
}

export interface PokemonApiCard {
  id: string;
  name: string;
  number?: string;
  rarity?: string;
  artist?: string;
  images?: { small?: string; large?: string };
  tcgplayer?: {
    prices?: Record<
      string, // "holofoil" | "normal" | "reverseHolofoil" | "1stEditionHolofoil" | ...
      { market?: number | null; low?: number | null; mid?: number | null; high?: number | null } | undefined
    >;
  };
  cardmarket?: {
    prices?: { averageSellPrice?: number | null; trendPrice?: number | null };
  };
}

export function mapPokemonSet(raw: PokemonApiSet): UnifiedSet {
  return {
    gameId: "pokemon",
    externalId: raw.id,
    name: raw.name,
    code: raw.id,
    releaseDate: raw.releaseDate ? new Date(raw.releaseDate.replace(/\//g, "-")) : undefined,
    symbolUrl: raw.images?.symbol,
    cardCount: raw.total ?? raw.printedTotal,
  };
}

/** Prefer TCGPlayer market price across common finishes, fall back to Cardmarket. */
function extractPrice(raw: PokemonApiCard): UnifiedCard["price"] {
  const tp = raw.tcgplayer?.prices;
  const market =
    tp?.holofoil?.market ??
    tp?.normal?.market ??
    tp?.reverseHolofoil?.market ??
    tp?.["1stEditionHolofoil"]?.market ??
    raw.cardmarket?.prices?.averageSellPrice ??
    undefined;
  const foil = tp?.holofoil?.market ?? tp?.reverseHolofoil?.market ?? undefined;

  if (market == null) return undefined;
  return {
    raw: market,
    foil: foil ?? undefined,
    currency: "USD",
    source: tp ? "pokemontcg.io" : "pokemontcg.io:cardmarket",
  };
}

export function mapPokemonCard(raw: PokemonApiCard, setExternalId: string): UnifiedCard {
  return {
    gameId: "pokemon",
    setExternalId,
    externalId: raw.id,
    name: raw.name,
    number: raw.number,
    rarity: raw.rarity,
    artist: raw.artist,
    imageSmallUrl: raw.images?.small,
    imageLargeUrl: raw.images?.large,
    productType: "CARD",
    language: "EN",
    price: extractPrice(raw),
  };
}

// --- tcgdex.net (non-English Pokémon sets) -------------------------------
//
// pokemontcg.io only has English cards. Japanese/Chinese(Simplified)/
// Chinese(Traditional)/Korean cards come from tcgdex.net instead (free, no
// key). Its bulk list endpoints only return brief card stubs (id/name/
// image) — rarity, illustrator, and pricing need one GET per card, done in
// tcgdex-client.ts with bounded concurrency. See that file for the fetch
// orchestration; this file only maps its raw shapes to UnifiedSet/Card.

export type TcgdexLang = "ja" | "zh-cn" | "zh-tw" | "ko";

/** tcgdex language code -> this app's CatalogItem.language / ItemLanguage code. */
export const TCGDEX_LANGUAGE_CODE: Record<TcgdexLang, string> = {
  ja: "JP",
  "zh-cn": "CN",
  "zh-tw": "TW",
  ko: "KR",
};

export interface TcgdexCardBrief {
  id: string;
  localId: string;
  name: string;
  image?: string;
}

export interface TcgdexSetBrief {
  id: string;
  name: string;
  cardCount?: { total?: number; official?: number };
}

export interface TcgdexSetDetail extends TcgdexSetBrief {
  releaseDate?: string; // "YYYY-MM-DD"
  symbol?: string;
  logo?: string;
  cards: TcgdexCardBrief[];
}

export interface TcgdexCardmarketPricing {
  unit?: string;
  avg?: number | null;
  trend?: number | null;
  "avg-holo"?: number | null;
  "trend-holo"?: number | null;
}

export interface TcgdexCardDetail extends TcgdexCardBrief {
  rarity?: string;
  illustrator?: string;
  pricing?: { cardmarket?: TcgdexCardmarketPricing };
}

export function mapTcgdexSet(raw: TcgdexSetDetail, lang: TcgdexLang): UnifiedSet {
  const code = `${lang}:${raw.id}`;
  return {
    gameId: "pokemon",
    externalId: code,
    name: raw.name,
    code,
    releaseDate: raw.releaseDate ? new Date(raw.releaseDate) : undefined,
    symbolUrl: raw.symbol,
    cardCount: raw.cardCount?.official ?? raw.cardCount?.total,
  };
}

/** Prefer Cardmarket's algorithmic trend price, falling back to its rolling average. */
function extractTcgdexPrice(raw: TcgdexCardDetail): UnifiedCard["price"] {
  const cm = raw.pricing?.cardmarket;
  if (!cm) return undefined;
  const market = cm.trend ?? cm.avg ?? undefined;
  if (market == null) return undefined;
  // tcgdex fills non-holo cards' "*-holo" fields with 0 rather than null, so
  // treat 0 the same as "no holo variant" rather than a real $0 price.
  const foil = cm["trend-holo"] || cm["avg-holo"] || undefined;
  return {
    raw: market,
    foil: foil ?? undefined,
    currency: cm.unit ?? "EUR",
    source: "tcgdex:cardmarket",
  };
}

export function mapTcgdexCard(
  raw: TcgdexCardDetail,
  lang: TcgdexLang,
  setExternalId: string
): UnifiedCard {
  return {
    gameId: "pokemon",
    setExternalId,
    externalId: `${lang}:${raw.id}`,
    name: raw.name,
    number: raw.localId,
    rarity: raw.rarity,
    artist: raw.illustrator,
    imageSmallUrl: raw.image ? `${raw.image}/low.webp` : undefined,
    imageLargeUrl: raw.image ? `${raw.image}/high.webp` : undefined,
    productType: "CARD",
    language: TCGDEX_LANGUAGE_CODE[lang],
    price: extractTcgdexPrice(raw),
  };
}
