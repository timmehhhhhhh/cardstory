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
