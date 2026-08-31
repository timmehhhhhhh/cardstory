import { buildDisplay, type DisplayInfo } from "@/lib/pc/selectors";
import type { CatalogItemDetail } from "@/lib/catalog/by-ids";
import type { SportsCardItemDetail } from "@/lib/sportscards/manage";
import type { WatchlistItem } from "@/lib/pc/types";
import { compareCardNumbers, compareDomains, compareNullsLast, compareNullsLastStr } from "@/lib/catalog/compare";
import { languageLabel } from "@/lib/format/language";

/**
 * A watchlist entry enriched with live catalog data — the watchlist's
 * counterpart to EnrichedShortlistItem (src/lib/shortlist/selectors.ts).
 * WatchlistItem only stores itemId/kind/addedAt/priceAtAdd (see
 * src/lib/pc/types.ts), so every other display field is looked up here
 * from the catalog/sports card the itemId points at, same as PC holdings
 * and shortlist rows.
 */
export interface EnrichedWatchlistItem extends WatchlistItem {
  catalogItem: CatalogItemDetail | undefined;
  sportsCardItem: SportsCardItemDetail | undefined;
  display: DisplayInfo;
  /** Live market price in USD — null for an untracked/unpriced card. */
  marketPrice: number | null;
  /** marketPrice - priceAtAdd, when both are known. */
  priceChangeSinceAdd: number | null;
}

export function enrichWatchlist(
  items: WatchlistItem[],
  catalogItems: CatalogItemDetail[],
  sportsCardItems: SportsCardItemDetail[]
): EnrichedWatchlistItem[] {
  const catalogById = new Map(catalogItems.map((c) => [c.id, c]));
  const sportsById = new Map(sportsCardItems.map((c) => [c.id, c]));

  return items.map((item) => {
    const catalogItem = item.kind === "tcg" ? catalogById.get(item.itemId) : undefined;
    const sportsCardItem = item.kind === "sports" ? sportsById.get(item.itemId) : undefined;
    const marketPrice = (item.kind === "sports" ? sportsCardItem?.priceRaw : catalogItem?.priceRaw) ?? null;

    return {
      ...item,
      catalogItem,
      sportsCardItem,
      display: buildDisplay(
        { kind: item.kind, sportsCardItemId: item.kind === "sports" ? item.itemId : undefined },
        catalogItem,
        sportsCardItem
      ),
      marketPrice,
      priceChangeSinceAdd: marketPrice != null && item.priceAtAdd != null ? marketPrice - item.priceAtAdd : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Filtering, sorting, and grouping — brings Watchlist to the same level of
// capability as Explore's SidebarFilters/SortDropdown (src/app/explore/_components),
// applied client-side over the already-fetched rows above rather than through
// a fresh server search — see watchlist-toolbar.tsx's doc comment for why.
// ---------------------------------------------------------------------------

/** A row's release date — the TCG set's release date when known, else a synthesized "YYYY-01-01" from the sports card's year, else null. Same shape as pc/selectors.ts's resolveReleaseDate. */
export function resolveWatchlistReleaseDate(row: EnrichedWatchlistItem): string | null {
  if (row.catalogItem?.releaseDate) return row.catalogItem.releaseDate;
  if (row.sportsCardItem?.year) return `${row.sportsCardItem.year}-01-01`;
  return null;
}

export interface WatchlistFilters {
  q: string;
  /** display.groupKey — a TCG gameId or `sports:<SPORT>`. Null = all games. */
  gameId: string | null;
  productType: "CARD" | "SEALED" | null;
  cardType: string | null;
  /** CatalogItem.variantKey — null = all variations. */
  variantKey: string | null;
  rarity: string | null;
  /** Riftbound only. */
  domain: string | null;
  /** Substring match against CatalogItem.artist, case-insensitive. Empty = no filter. */
  artist: string;
  /** CatalogItem.language — null = all languages. */
  language: string | null;
}

export const DEFAULT_WATCHLIST_FILTERS: WatchlistFilters = {
  q: "",
  gameId: null,
  productType: null,
  cardType: null,
  variantKey: null,
  rarity: null,
  domain: null,
  artist: "",
  language: null,
};

export function watchlistFiltersActive(filters: WatchlistFilters): boolean {
  return (
    filters.q.trim() !== "" ||
    filters.gameId != null ||
    filters.productType != null ||
    filters.cardType != null ||
    filters.variantKey != null ||
    filters.rarity != null ||
    filters.domain != null ||
    filters.artist.trim() !== "" ||
    filters.language != null
  );
}

/**
 * Narrows watchlist rows to those matching every active filter — sports
 * rows simply never match a TCG-only filter (cardType/variant/rarity/
 * domain/artist/language) they have no data for, the same way Explore
 * excludes sports from those facets (sportsFilterableFor in
 * src/lib/catalog/search.ts) rather than throwing.
 */
export function filterWatchlist(rows: EnrichedWatchlistItem[], filters: WatchlistFilters): EnrichedWatchlistItem[] {
  const q = filters.q.trim().toLowerCase();
  const artist = filters.artist.trim().toLowerCase();

  return rows.filter((r) => {
    if (q) {
      const name = r.display.name.toLowerCase();
      const nameEn = r.display.nameEn?.toLowerCase() ?? "";
      if (!name.includes(q) && !nameEn.includes(q)) return false;
    }
    if (filters.gameId && r.display.groupKey !== filters.gameId) return false;
    if (filters.productType && r.catalogItem?.productType !== filters.productType) return false;
    if (filters.cardType && r.catalogItem?.cardType !== filters.cardType) return false;
    if (filters.variantKey && r.catalogItem?.variantKey !== filters.variantKey) return false;
    if (filters.rarity && r.catalogItem?.rarity !== filters.rarity) return false;
    if (filters.domain && !(r.catalogItem?.domain ?? []).includes(filters.domain)) return false;
    if (artist && !(r.catalogItem?.artist ?? "").toLowerCase().includes(artist)) return false;
    if (filters.language && (r.catalogItem?.language ?? "EN") !== filters.language) return false;
    return true;
  });
}

/**
 * Same field+direction-combined shape as CatalogSort (src/lib/catalog/search.ts's
 * CATALOG_SORTS) so Watchlist's sort dropdown mirrors Explore's one-to-one —
 * plus "recently_added" (addedAt desc), Watchlist's own default, since
 * Explore's "best_match" has no meaning without a search query.
 */
export const WATCHLIST_SORTS = [
  "recently_added",
  "name_asc",
  "number_asc",
  "domain_asc",
  "type_asc",
  "release_desc",
  "release_asc",
  "price_desc",
  "price_asc",
  "trending_up",
  "trending_down",
] as const;
export type WatchlistSort = (typeof WATCHLIST_SORTS)[number];

/** Stable sort — ties keep their incoming order — so switching sort fields doesn't needlessly reshuffle rows that compare equal. */
export function sortWatchlist(rows: EnrichedWatchlistItem[], sort: WatchlistSort): EnrichedWatchlistItem[] {
  return [...rows].sort((a, b) => {
    switch (sort) {
      case "name_asc":
        return a.display.name.localeCompare(b.display.name);
      case "number_asc":
        return compareCardNumbers(a.display.number, b.display.number) || a.display.name.localeCompare(b.display.name);
      case "domain_asc":
        return (
          compareDomains(a.catalogItem?.domain ?? [], b.catalogItem?.domain ?? []) ||
          a.display.name.localeCompare(b.display.name)
        );
      case "type_asc": {
        const at = a.catalogItem?.cardType ?? "";
        const bt = b.catalogItem?.cardType ?? "";
        return at.localeCompare(bt) || a.display.name.localeCompare(b.display.name);
      }
      case "release_desc":
        return (
          compareNullsLastStr(resolveWatchlistReleaseDate(a), resolveWatchlistReleaseDate(b), false) ||
          a.display.name.localeCompare(b.display.name)
        );
      case "release_asc":
        return (
          compareNullsLastStr(resolveWatchlistReleaseDate(a), resolveWatchlistReleaseDate(b), true) ||
          a.display.name.localeCompare(b.display.name)
        );
      case "price_desc":
        return compareNullsLast(a.marketPrice, b.marketPrice, false) || a.display.name.localeCompare(b.display.name);
      case "price_asc":
        return compareNullsLast(a.marketPrice, b.marketPrice, true) || a.display.name.localeCompare(b.display.name);
      case "trending_up":
        return compareNullsLast(a.display.priceChangePct, b.display.priceChangePct, false);
      case "trending_down":
        return compareNullsLast(a.display.priceChangePct, b.display.priceChangePct, true);
      case "recently_added":
      default:
        return b.addedAt.localeCompare(a.addedAt);
    }
  });
}

export type WatchlistGroupField = "none" | "set" | "language" | "game" | "rarity";

export interface WatchlistGroup {
  key: string;
  /** Empty string for the single "none" group — see groupWatchlist. */
  label: string;
  rows: EnrichedWatchlistItem[];
}

/**
 * Sections already-sorted rows into labeled groups — orthogonal to
 * sortWatchlist above, which decides each row's order both overall and
 * within its group. "none" returns a single, unlabeled group so callers can
 * render unconditionally. Same shape as pc/selectors.ts's groupRows.
 */
export function groupWatchlist(rows: EnrichedWatchlistItem[], field: WatchlistGroupField): WatchlistGroup[] {
  if (field === "none") return [{ key: "all", label: "", rows }];

  const UNKNOWN =
    field === "language" ? "Unknown Language" : field === "rarity" ? "Unknown Rarity" : field === "game" ? "Unknown Game" : "Unknown Set";
  const keyOf = (r: EnrichedWatchlistItem): string => {
    switch (field) {
      case "set":
        return r.catalogItem?.setName ?? r.sportsCardItem?.setName ?? UNKNOWN;
      case "language":
        return r.catalogItem ? languageLabel(r.catalogItem.language) : languageLabel("EN");
      case "game":
        return r.display.groupLabel;
      case "rarity":
        return r.catalogItem?.rarity ?? UNKNOWN;
      default:
        return UNKNOWN;
    }
  };

  const map = new Map<string, WatchlistGroup>();
  for (const r of rows) {
    const key = keyOf(r);
    const group = map.get(key);
    if (group) group.rows.push(r);
    else map.set(key, { key, label: key, rows: [r] });
  }

  const groups = Array.from(map.values());
  groups.sort((a, b) => {
    if (a.key === UNKNOWN && b.key === UNKNOWN) return 0;
    if (a.key === UNKNOWN) return 1;
    if (b.key === UNKNOWN) return -1;
    return a.key.localeCompare(b.key);
  });
  return groups;
}

export interface WatchlistFacets {
  games: { id: string; label: string }[];
  cardTypes: string[];
  variants: { key: string; label: string }[];
  rarities: string[];
  domains: string[];
  languages: string[];
  hasSealed: boolean;
}

/**
 * Filter option lists derived from the rows actually in the user's
 * watchlist — unlike Explore's SidebarFilters (whose facet lists come from
 * fresh `getDistinct*` queries over the *entire* catalog, see
 * src/lib/catalog/search.ts), Watchlist only ever needs to offer choices
 * that exist among what's already loaded, so no extra query is needed.
 * Computed from the full (unfiltered) row set, same as Explore, so options
 * don't disappear as other filters narrow the visible rows.
 */
export function computeWatchlistFacets(rows: EnrichedWatchlistItem[]): WatchlistFacets {
  const games = new Map<string, string>();
  const cardTypes = new Set<string>();
  const variants = new Map<string, string>();
  const rarities = new Set<string>();
  const domains = new Set<string>();
  const languages = new Set<string>();
  let hasSealed = false;

  for (const r of rows) {
    games.set(r.display.groupKey, r.display.groupLabel);
    if (r.catalogItem?.cardType) cardTypes.add(r.catalogItem.cardType);
    if (r.catalogItem?.variantKey && r.catalogItem.variantLabel) {
      variants.set(r.catalogItem.variantKey, r.catalogItem.variantLabel);
    }
    if (r.catalogItem?.rarity) rarities.add(r.catalogItem.rarity);
    for (const d of r.catalogItem?.domain ?? []) domains.add(d);
    if (r.catalogItem) languages.add(r.catalogItem.language);
    if (r.catalogItem?.productType === "SEALED") hasSealed = true;
  }

  return {
    games: Array.from(games, ([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label)),
    cardTypes: Array.from(cardTypes).sort(),
    variants: Array.from(variants, ([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label)),
    rarities: Array.from(rarities).sort(),
    domains: Array.from(domains).sort(),
    languages: Array.from(languages).sort(),
    hasSealed,
  };
}
