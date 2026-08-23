import type { ExploreFilters } from "@/app/explore/_components/types";
import type { ViewFilters } from "@/lib/views/types";

/**
 * Comma-joins array fields for querying /api/catalog/search (see
 * parseMulti in src/app/api/catalog/search/route.ts, which splits them
 * back apart) from the Views UI's live results panel.
 *
 * Known accepted limitation: an artist name containing a literal comma
 * would be mis-split by this round trip. Not worth escaping for — chips
 * are entered one at a time (see the artist input in view-builder.tsx),
 * and this matches the existing onlyIds/excludeIds convention of bare-
 * comma joining ids.
 */
export function viewFiltersToSearchParams(f: ViewFilters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.game !== "all") sp.set("game", f.game);
  if (f.set) sp.set("set", f.set);
  if (f.type !== "all") sp.set("type", f.type);
  if (f.cardTypes.length > 0) sp.set("cardType", f.cardTypes.join(","));
  if (f.rarities.length > 0) sp.set("rarity", f.rarities.join(","));
  if (f.domains.length > 0) sp.set("domain", f.domains.join(","));
  if (f.languages.length > 0) sp.set("language", f.languages.join(","));
  if (f.artists.length > 0) sp.set("artist", f.artists.join(","));
  if (f.baseOnly) sp.set("baseOnly", "1");
  if (f.sort !== "best_match") sp.set("sort", f.sort);
  return sp;
}

/**
 * "Save current search as a View" — wraps Explore's single-value fields
 * into one-element arrays, drops "all" down to [], and drops the
 * page-browsing-only fields (status, watchlistOnly, view, page) that
 * ViewFilters deliberately has no room for. Explore has no structured
 * artist filter today (artist only participates in its free-text q
 * search), so `artists` always starts empty here.
 */
export function exploreFiltersToViewFilters(f: ExploreFilters): ViewFilters {
  return {
    q: f.q,
    game: f.game,
    set: f.set,
    type: f.type,
    cardTypes: f.cardType !== "all" ? [f.cardType] : [],
    rarities: f.rarity !== "all" ? [f.rarity] : [],
    domains: f.domain !== "all" ? [f.domain] : [],
    languages: f.language !== "all" ? [f.language] : [],
    artists: [],
    baseOnly: f.baseOnly,
    sort: f.sort,
  };
}
