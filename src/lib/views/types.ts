import type { CatalogSort } from "@/lib/catalog/search";

/**
 * What defines a saved View (src/app/views) — a superset of ExploreFilters'
 * filtering fields (src/app/explore/_components/types.ts), but multi-select:
 * the three plain-string facets become string[] (OR'd within each field),
 * plus a new `artists` free-text-chip array (also OR'd, each chip matched
 * via case-insensitive "contains" — see tcgWhereFor in
 * src/lib/catalog/search.ts). Deliberately omits Explore's page-level-only
 * fields (status, watchlistOnly, view, page) — those describe how someone
 * is currently browsing results, not what the View itself means.
 */
export interface ViewFilters {
  q: string;
  /** "all" | gameId — stays scalar, not multi-select (a View targets one game or all of them). */
  game: string;
  /** "" | setId */
  set: string;
  type: "all" | "CARD" | "SEALED";
  /** [] = all. Game-specific card type labels, e.g. Riftbound's "Champion Unit". */
  cardTypes: string[];
  /** [] = all. CatalogItem.rarity values, e.g. "Ultra Rare" or "Epic". */
  rarities: string[];
  /** [] = all. CatalogItem.language — no-op for sports rows. */
  languages: ("EN" | "JP" | "CN" | "TW" | "KR")[];
  /** Free-text artist name chips, OR'd via case-insensitive "contains". No-op for sports rows (no artist column). */
  artists: string[];
  /** Sports cards only — hide every parallel, showing just each card's base version. */
  baseOnly: boolean;
  sort: CatalogSort;
}

export const DEFAULT_VIEW_FILTERS: ViewFilters = {
  q: "",
  game: "all",
  set: "",
  type: "all",
  cardTypes: [],
  rarities: [],
  languages: [],
  artists: [],
  baseOnly: false,
  sort: "best_match",
};

export interface SavedView {
  id: string;
  name: string;
  filters: ViewFilters;
  createdAt: string;
  updatedAt: string;
}
