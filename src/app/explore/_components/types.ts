import type { CatalogSort } from "@/lib/catalog/search";

export interface ExploreFilters {
  q: string;
  game: string; // "all" | gameId
  set: string; // "" | setId, comes from a /sets/[game] deep link
  type: "all" | "CARD" | "SEALED";
  cardType: string; // "all" | CatalogItem.cardType label, e.g. Riftbound's "Champion Unit"
  rarity: string; // "all" | CatalogItem.rarity value, e.g. "Ultra Rare" or "Epic"
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
    status: (get("status") as ExploreFilters["status"]) ?? DEFAULT_FILTERS.status,
    watchlistOnly: get("watchlist") === "1",
    sort: (get("sort") as ExploreFilters["sort"]) ?? DEFAULT_FILTERS.sort,
    view: (get("view") as ExploreFilters["view"]) ?? DEFAULT_FILTERS.view,
    page: Number(get("page") ?? 1) || 1,
  };
}
