import type { CatalogSort } from "@/lib/catalog/search";

export interface ExploreFilters {
  q: string;
  game: string; // "all" | gameId
  set: string; // "" | setId, comes from a /sets/[game] deep link
  type: "all" | "CARD" | "SEALED";
  cardType: string; // "all" | CatalogItem.cardType label, per-game (e.g. Riftbound's "Champion Unit" or Flesh & Blood's "Hero")
  rarity: string; // "all" | CatalogItem.rarity value, e.g. "Ultra Rare" or "Epic"
  domain: string; // "all" | CatalogItem.domain value, e.g. Riftbound's "Fury" — no-op for every other game
  variant: string; // "all" | CatalogItem.variantKey, a card's priced finish, e.g. Pokémon's "reverseHolofoil" — no-op for sports cards and every non-Pokémon game
  artist: string; // "" | free-text artist name, matched case-insensitive "contains" — no-op for sports cards (no artist column)
  language: "all" | "EN" | "JP" | "CN" | "TW" | "KR"; // CatalogItem.language — no-op for sports cards
  /** Sports cards only — hide every parallel, showing just each card's base version. */
  baseOnly: boolean;
  status: "all" | "owned" | "not_owned";
  watchlistOnly: boolean;
  sort: CatalogSort;
  view: "grid" | "list";
  page: number;
}

export const DEFAULT_FILTERS: ExploreFilters = {
  q: "",
  game: "all",
  set: "",
  type: "all",
  cardType: "all",
  rarity: "all",
  domain: "all",
  variant: "all",
  artist: "",
  language: "all",
  baseOnly: false,
  status: "all",
  watchlistOnly: false,
  sort: "best_match",
  view: "grid",
  page: 1,
};

export function filtersToSearchParams(f: ExploreFilters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.game !== "all") sp.set("game", f.game);
  if (f.set) sp.set("set", f.set);
  if (f.type !== "all") sp.set("type", f.type);
  if (f.cardType !== "all") sp.set("cardType", f.cardType);
  if (f.rarity !== "all") sp.set("rarity", f.rarity);
  if (f.domain !== "all") sp.set("domain", f.domain);
  if (f.variant !== "all") sp.set("variant", f.variant);
  if (f.artist) sp.set("artist", f.artist);
  if (f.language !== "all") sp.set("language", f.language);
  if (f.baseOnly) sp.set("baseOnly", "1");
  if (f.status !== "all") sp.set("status", f.status);
  if (f.watchlistOnly) sp.set("watchlist", "1");
  if (f.sort !== "best_match") sp.set("sort", f.sort);
  if (f.view !== "grid") sp.set("view", f.view);
  if (f.page > 1) sp.set("page", String(f.page));
  return sp;
}

export function filtersFromSearchParams(
  sp: URLSearchParams | Record<string, string | string[] | undefined>
): ExploreFilters {
  const get = (key: string): string | undefined =>
    sp instanceof URLSearchParams ? (sp.get(key) ?? undefined) : (sp[key] as string | undefined);

  return {
    q: get("q") ?? DEFAULT_FILTERS.q,
    game: get("game") ?? DEFAULT_FILTERS.game,
    set: get("set") ?? DEFAULT_FILTERS.set,
    type: (get("type") as ExploreFilters["type"]) ?? DEFAULT_FILTERS.type,
    cardType: get("cardType") ?? DEFAULT_FILTERS.cardType,
    rarity: get("rarity") ?? DEFAULT_FILTERS.rarity,
    domain: get("domain") ?? DEFAULT_FILTERS.domain,
    variant: get("variant") ?? DEFAULT_FILTERS.variant,
    artist: get("artist") ?? DEFAULT_FILTERS.artist,
    language: (get("language") as ExploreFilters["language"]) ?? DEFAULT_FILTERS.language,
    baseOnly: get("baseOnly") === "1",
    status: (get("status") as ExploreFilters["status"]) ?? DEFAULT_FILTERS.status,
    watchlistOnly: get("watchlist") === "1",
    sort: (get("sort") as ExploreFilters["sort"]) ?? DEFAULT_FILTERS.sort,
    view: (get("view") as ExploreFilters["view"]) ?? DEFAULT_FILTERS.view,
    page: Number(get("page") ?? 1) || 1,
  };
}
