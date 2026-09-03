/**
 * sessionStorage key ExploreClient uses to remember the last
 * sort/filter/order the user configured on Explore. ExploreClient restores
 * it when the top-nav "Explore" link lands on a bare `/explore` with no
 * query string; buildSetSearchHref below reads the same key so a search-bar
 * jump to a set carries that config over too, instead of resetting to
 * Explore's defaults the way set-tile.tsx's plain `?game=&set=` link does.
 * Session-scoped (tab-local), not localStorage — this restores "what you
 * were just looking at", not a durable cross-session preference.
 */
export const LAST_QUERY_STORAGE_KEY = "cardstory:explore:last-query";

/**
 * Builds an `/explore` href for a resolved set, carrying over whatever
 * sort/filter/order the user last configured on Explore (from sessionStorage)
 * rather than resetting to Explore's defaults — set-tile.tsx's plain
 * `?game=&set=` link doesn't do this, which is fine for browsing from
 * /sets but wrong for a search-bar jump where the user expects "show me
 * this set the way I already like Explore set up".
 */
export function buildSetSearchHref(gameId: string, setId: string): string {
  let params: URLSearchParams;
  try {
    const saved = window.sessionStorage.getItem(LAST_QUERY_STORAGE_KEY);
    params = new URLSearchParams(saved ?? "");
  } catch {
    params = new URLSearchParams();
  }
  params.set("game", gameId);
  params.set("set", setId);
  // A fresh set view should start on page 1 even if the last query was
  // deep into pagination.
  params.delete("page");
  return `/explore?${params.toString()}`;
}
