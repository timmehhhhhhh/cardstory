"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_WATCHLIST_FILTERS,
  WATCHLIST_SORTS,
  type WatchlistFilters,
  type WatchlistGroupField,
  type WatchlistSort,
} from "@/lib/watchlist/selectors";

const GROUP_FIELDS: WatchlistGroupField[] = ["none", "set", "language", "game", "rarity"];
const DEFAULT_SORT: WatchlistSort = "recently_added";
const DEFAULT_GROUP: WatchlistGroupField = "none";

/**
 * URL-persisted filter/sort/group state for the Watchlist toolbar — same
 * "URL is the source of truth, defaults omitted from the query string"
 * convention as Sets' SortControls and Explore's ExploreFilters
 * (src/app/explore/_components/types.ts), applied client-side over the
 * already-fetched watchlist rows instead of driving a server refetch (see
 * watchlist-toolbar.tsx's doc comment for why Watchlist doesn't reuse
 * Explore's server-search-backed filter state directly).
 */
export function useWatchlistControls() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sortParam = searchParams.get("sort");
  const sort: WatchlistSort = (WATCHLIST_SORTS as readonly string[]).includes(sortParam ?? "")
    ? (sortParam as WatchlistSort)
    : DEFAULT_SORT;

  const groupParam = searchParams.get("group");
  const group: WatchlistGroupField = GROUP_FIELDS.includes(groupParam as WatchlistGroupField)
    ? (groupParam as WatchlistGroupField)
    : DEFAULT_GROUP;

  const filters: WatchlistFilters = {
    q: searchParams.get("q") ?? DEFAULT_WATCHLIST_FILTERS.q,
    gameId: searchParams.get("game"),
    productType:
      searchParams.get("type") === "CARD" || searchParams.get("type") === "SEALED"
        ? (searchParams.get("type") as "CARD" | "SEALED")
        : null,
    cardType: searchParams.get("cardType"),
    variantKey: searchParams.get("variant"),
    rarity: searchParams.get("rarity"),
    domain: searchParams.get("domain"),
    artist: searchParams.get("artist") ?? DEFAULT_WATCHLIST_FILTERS.artist,
    language: searchParams.get("language"),
  };

  function push(next: URLSearchParams) {
    const query = next.toString();
    router.push(query ? `?${query}` : "?", { scroll: false });
  }

  function updateFilters(patch: Partial<WatchlistFilters>) {
    const merged = { ...filters, ...patch };
    const params = new URLSearchParams(searchParams.toString());
    const setOrDelete = (key: string, value: string | null | undefined) => {
      if (value == null || value === "") params.delete(key);
      else params.set(key, value);
    };
    setOrDelete("q", merged.q);
    setOrDelete("game", merged.gameId);
    setOrDelete("type", merged.productType);
    setOrDelete("cardType", merged.cardType);
    setOrDelete("variant", merged.variantKey);
    setOrDelete("rarity", merged.rarity);
    setOrDelete("domain", merged.domain);
    setOrDelete("artist", merged.artist);
    setOrDelete("language", merged.language);
    push(params);
  }

  function updateSort(next: WatchlistSort) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === DEFAULT_SORT) params.delete("sort");
    else params.set("sort", next);
    push(params);
  }

  function updateGroup(next: WatchlistGroupField) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === DEFAULT_GROUP) params.delete("group");
    else params.set("group", next);
    push(params);
  }

  function clearFilters() {
    updateFilters(DEFAULT_WATCHLIST_FILTERS);
  }

  return { filters, sort, group, updateFilters, updateSort, updateGroup, clearFilters };
}
