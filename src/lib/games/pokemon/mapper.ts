import type { UnifiedCard, UnifiedSet } from "@/lib/games/types";
import { FX_RATES_TO_USD } from "@/lib/constants";
// Relative, not "@/..." — the translation table lives under scripts/data/
// (alongside scripts/data/pokemon-manual/), outside the "@/*" -> "./src/*"
// alias's reach.
import { POKEMON_SET_TRANSLATIONS } from "../../../../scripts/data/pokemon-set-translations";
import { resolvePokemonCardNameEn } from "@/lib/games/pokemon/card-name-en";

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
  /** "Pokémon" | "Trainer" | "Energy" — see cardTypeFromSupertype below. */
  supertype?: string;
  /** e.g. ["Basic"], ["Stage 1"], ["Item"], ["Basic"] (for Basic Energy) — see cardTypeFromSupertype below. */
  subtypes?: string[];
  /** National Pokédex number(s), e.g. [6] for Charizard, [133, 134] for a two-species combo/TAG TEAM card. Absent for Trainer/Energy cards. */
  nationalPokedexNumbers?: number[];
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
    logoUrl: raw.images?.logo,
    cardCount: raw.total ?? raw.printedTotal,
  };
}

// --- Finish/variant labeling -----------------------------------------------
//
// pokemontcg.io prices each card under one or more "finish" keys inside
// tcgplayer.prices (e.g. "holofoil", "reverseHolofoil", "1stEditionHolofoil").
// Every card used to collapse to a single UnifiedCard by picking one of
// these via priority fallback; mapPokemonCardVariants below instead expands
// into one UnifiedCard per priced finish actually present, so each becomes
// its own addable CatalogItem row (see scripts/seed-catalog.ts).

/** Default, generic display label per known provider finish key. */
const FINISH_LABELS: Record<string, string> = {
  normal: "Normal",
  holofoil: "Holofoil",
  reverseHolofoil: "Reverse Holo",
  "1stEdition": "1st Edition",
  "1stEditionNormal": "1st Edition Normal",
  "1stEditionHolofoil": "1st Edition Holofoil",
  "1stEditionUnlimited": "1st Edition Unlimited",
  unlimited: "Unlimited",
  unlimitedHolofoil: "Unlimited Holofoil",
  // Not a pokemontcg.io-provided key — see scripts/apply-cosmos-holo-variant.ts.
  // A curated subset of `reverseHolofoil` rows TCGCollector independently
  // verifies as using the "Cosmos Holo" foil texture gets its variantKey
  // rewritten to this at import time, specifically so it gets its own
  // Explore filter entry (see getDistinctVariants in lib/catalog/search.ts) —
  // unlike finish-patterns.ts's curated overlays, which stay display-only.
  cosmosHolo: "Cosmos Holo",
};

/** "someNewFinish" -> "Some New Finish" — a readable fallback for a finish key this app doesn't recognize yet, so an unseen provider key still renders something legible instead of being silently dropped. */
function titleCaseFallback(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
}

/** Generic display label for a finish key — NOT the curated collector-pattern override, see lib/games/pokemon/finish-patterns.ts for that. */
export function defaultFinishLabel(variantKey: string): string {
  return FINISH_LABELS[variantKey] ?? titleCaseFallback(variantKey);
}

/**
 * Same priority order today's (pre-variant) extractPrice() used to pick a
 * single price — reused here only to decide which present finish is
 * "primary" (keeps the pre-existing, unsuffixed CatalogItem id — see
 * scripts/seed-catalog.ts) so existing Holding/WatchlistEntry references
 * keep resolving after this card gains additional variant rows.
 */
const PRICE_KEY_PRIORITY = ["holofoil", "normal", "reverseHolofoil", "1stEditionHolofoil"] as const;

/**
 * One UnifiedCard per priced finish actually present on `raw` — iterates
 * whatever keys tcgplayer.prices actually has (no hardcoded allowlist) so
 * an unseen finish still produces a card instead of being silently dropped.
 * Ordered primary-first (see PRICE_KEY_PRIORITY). Cards with no tcgplayer
 * pricing fall back to a single Cardmarket-priced row, and cards with no
 * price data at all still produce a single unpriced row — both preserve
 * today's exact behavior, just without the old price-folding.
 */
/**
 * pokemontcg.io's `supertype` ("Pokémon" | "Trainer" | "Energy") and
 * `subtypes` (e.g. ["Basic"], ["Stage 1"], ["Item"]) combined into
 * CatalogItem.cardType, e.g. "Pokémon · Basic", "Trainer", "Energy · Basic"
 * — the "Basic" marker on Pokémon/Energy is what Deck Crafting's format
 * rules key off of (a legal deck needs ≥1 Basic Pokémon; Basic Energy is
 * exempt from the 4-copy limit — see src/lib/deck-crafting/formats/pokemon.ts).
 * Only the "Basic" subtype is folded in (not e.g. "Stage 1" or "Item") since
 * that's the only one any format rule currently keys off of; undefined when
 * supertype itself is missing, which tcgdex-sourced (non-English) cards
 * currently are — see mapTcgdexCard below.
 */
export function cardTypeFromSupertype(supertype: string | undefined, subtypes: string[] | undefined): string | undefined {
  if (!supertype) return undefined;
  const isBasic = subtypes?.includes("Basic");
  return isBasic ? `${supertype} · Basic` : supertype;
}

export function mapPokemonCardVariants(raw: PokemonApiCard, setExternalId: string): UnifiedCard[] {
  const base = {
    gameId: "pokemon",
    setExternalId,
    externalId: raw.id,
    name: raw.name,
    number: raw.number,
    rarity: raw.rarity,
    artist: raw.artist,
    cardType: cardTypeFromSupertype(raw.supertype, raw.subtypes),
    nationalPokedexNumbers: raw.nationalPokedexNumbers ?? [],
    imageSmallUrl: raw.images?.small,
    imageLargeUrl: raw.images?.large,
    productType: "CARD" as const,
    language: "EN",
  };

  const tp = raw.tcgplayer?.prices;
  const presentKeys = tp ? Object.keys(tp).filter((k) => tp[k]?.market != null) : [];

  if (presentKeys.length === 0) {
    const cmPrice = raw.cardmarket?.prices?.averageSellPrice;
    if (cmPrice != null) {
      return [{ ...base, price: { raw: cmPrice, currency: "USD", source: "pokemontcg.io:cardmarket" } }];
    }
    return [{ ...base }]; // no price data anywhere — unpriced cards must not silently disappear
  }

  const primaryKey = PRICE_KEY_PRIORITY.find((k) => presentKeys.includes(k)) ?? presentKeys[0];
  const orderedKeys = [primaryKey, ...presentKeys.filter((k) => k !== primaryKey)];

  return orderedKeys.map((key) => ({
    ...base,
    variantKey: key,
    variantLabel: defaultFinishLabel(key),
    price: {
      raw: tp![key]!.market as number,
      // Kept for any code still reading .foil (e.g. CatalogItem.latestPriceFoil) —
      // only meaningful for a holo-family finish, mirroring the old
      // `foil = holofoil ?? reverseHolofoil` behavior.
      foil: /holofoil/i.test(key) ? (tp![key]!.market as number) : undefined,
      currency: "USD",
      source: "pokemontcg.io",
    },
  }));
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
  /** e.g. { id: "SV", name: "Scarlet & Violet" } — used to build the "univ" symbol asset URL below, since non-English set responses omit `symbol`/`logo` entirely. */
  serie?: { id: string };
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
  /** "Pokemon" | "Trainer" | "Energy" — confirmed present on the live API (e.g. `curl https://api.tcgdex.net/v2/en/cards/base1-4`) even though it went unused until now. */
  category?: string;
  /** National Pokédex number(s); absent for Trainer/Energy cards. */
  dexId?: number[];
  pricing?: { cardmarket?: TcgdexCardmarketPricing };
}

/** tcgdex's "Pokemon" | "Trainer" | "Energy" -> this app's cardType convention — see cardTypeFromSupertype's doc comment. No "· Basic" suffix: tcgdex doesn't expose a subtypes equivalent, and no Deck Crafting format rule targets non-English cards. */
function cardTypeFromTcgdexCategory(category: string | undefined): string | undefined {
  switch (category) {
    case "Pokemon":
      return "Pokémon";
    case "Trainer":
      return "Trainer";
    case "Energy":
      return "Energy";
    default:
      return undefined;
  }
}

/**
 * tcgdex's per-language `/sets/{id}` response only carries `symbol`/`logo`
 * URLs for the "en" locale (confirmed against the live API — every other
 * language's response omits both fields entirely). Symbols, however, are
 * shared set-branding art, not per-language translations, and are hosted
 * under a language-agnostic "univ" path keyed by the same serie/set id every
 * locale already shares — e.g. `univ/sv/sv10/symbol.png` — so it can be
 * reconstructed for JA/ZH/KO sets even though their own API response is
 * silent on it. Logos DO vary by language (translated wordmark) and tcgdex
 * only actually hosts the English one, so there's no equivalent
 * reconstruction for logoUrl here — non-English sets simply fall back to
 * this (now real, rather than always-missing) symbol icon in the UI.
 */
function tcgdexUnivSymbolUrl(raw: TcgdexSetDetail): string | undefined {
  if (!raw.serie?.id) return undefined;
  return `https://assets.tcgdex.net/univ/${raw.serie.id.toLowerCase()}/${raw.id.toLowerCase()}/symbol.png`;
}

export function mapTcgdexSet(raw: TcgdexSetDetail, lang: TcgdexLang): UnifiedSet {
  const code = `${lang}:${raw.id}`;
  return {
    gameId: "pokemon",
    externalId: code,
    name: raw.name,
    // Left unset (not null) for any code missing from the table — mirrors
    // CatalogItem.nameEn's "not yet identified" convention — see
    // scripts/data/pokemon-set-translations.ts.
    nameEn: POKEMON_SET_TRANSLATIONS[code],
    code,
    releaseDate: raw.releaseDate ? new Date(raw.releaseDate) : undefined,
    symbolUrl: raw.symbol ?? tcgdexUnivSymbolUrl(raw),
    logoUrl: raw.logo,
    cardCount: raw.cardCount?.official ?? raw.cardCount?.total,
  };
}

/**
 * tcgdex only exposes two price tiers per card (base + holo), unlike
 * pokemontcg.io's full finish list — so at most 2 UnifiedCards come out of
 * this per raw card. "Normal" (base) is ordered first when present, since
 * that's what a plain (pre-variant) mapTcgdexCard used to put on the single
 * row's `price.raw`, so it keeps the pre-existing unsuffixed CatalogItem id
 * (see scripts/seed-catalog.ts). Cardmarket quotes in EUR — every price
 * elsewhere in this app assumes USD (see upsertPriceSnapshot / formatMoney),
 * so both tiers are converted via the app's static FX table rather than
 * silently mis-pricing non-English cards by storing EUR as if it were USD.
 */
export function mapTcgdexCardVariants(
  raw: TcgdexCardDetail,
  lang: TcgdexLang,
  setExternalId: string
): UnifiedCard[] {
  const base = {
    gameId: "pokemon",
    setExternalId,
    externalId: `${lang}:${raw.id}`,
    name: raw.name,
    // `undefined` (not `null`) when unresolved — see CatalogItem.nameEn's
    // "not yet identified" convention, same as symbolUrl/logoUrl below.
    nameEn: resolvePokemonCardNameEn(raw.name, TCGDEX_LANGUAGE_CODE[lang]),
    number: raw.localId,
    rarity: raw.rarity,
    artist: raw.illustrator,
    cardType: cardTypeFromTcgdexCategory(raw.category),
    nationalPokedexNumbers: raw.dexId ?? [],
    // `undefined`, NOT `null`, is load-bearing: seed-catalog.ts passes these
    // straight into a Prisma `update`, where undefined means "leave alone".
    // Changing it to `?? null` would wipe every image backfilled from the
    // official publisher sites (scripts/seed-card-images.ts) on the next
    // `npm run seed:catalog`.
    imageSmallUrl: raw.image ? `${raw.image}/low.webp` : undefined,
    imageLargeUrl: raw.image ? `${raw.image}/high.webp` : undefined,
    productType: "CARD" as const,
    language: TCGDEX_LANGUAGE_CODE[lang],
  };

  const cm = raw.pricing?.cardmarket;
  if (!cm) return [{ ...base }];

  const unit = cm.unit ?? "EUR";
  const rateToUsd = FX_RATES_TO_USD[unit as keyof typeof FX_RATES_TO_USD];
  if (!rateToUsd) return [{ ...base }]; // unrecognized currency — skip rather than mis-price

  const normalMarket = cm.trend ?? cm.avg ?? undefined;
  // tcgdex fills non-holo cards' "*-holo" fields with 0 rather than null, so
  // treat 0 the same as "no holo variant" rather than a real $0 price.
  const holoMarket = cm["trend-holo"] || cm["avg-holo"] || undefined;

  const variants: UnifiedCard[] = [];
  if (normalMarket != null) {
    variants.push({
      ...base,
      variantKey: "normal",
      variantLabel: defaultFinishLabel("normal"),
      price: { raw: normalMarket / rateToUsd, currency: "USD", source: "tcgdex:cardmarket" },
    });
  }
  if (holoMarket != null) {
    const holoUsd = holoMarket / rateToUsd;
    variants.push({
      ...base,
      variantKey: "holofoil",
      variantLabel: defaultFinishLabel("holofoil"),
      price: { raw: holoUsd, foil: holoUsd, currency: "USD", source: "tcgdex:cardmarket" },
    });
  }

  return variants.length > 0 ? variants : [{ ...base }];
}
