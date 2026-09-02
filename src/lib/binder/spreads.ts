import type { BinderPage } from "@/lib/binder/types";

/**
 * Book-style spreads: `[null, page1], [page2, page3], [page4, page5], ...`
 * — mirrors how a real book/binder opens. The first page sits alone against
 * the blank inside front cover (no "page 0" to pair with it), then every
 * following spread pairs two consecutive pages, same as flipping through a
 * physical binder. Shared by the main planner (BinderClient) and the
 * fullscreen Preview so they always agree on which pages share a spread.
 */
export function bookSpreads(pages: BinderPage[]): (BinderPage | null)[][] {
  if (pages.length === 0) return [];
  const spreads: (BinderPage | null)[][] = [[null, pages[0]]];
  for (let i = 1; i < pages.length; i += 2) {
    spreads.push([pages[i], pages[i + 1] ?? null]);
  }
  return spreads;
}

/** The 0-based index into `bookSpreads(pages)` that contains `pageIndex` (a 0-based page-array index). */
export function spreadIndexForPage(pageIndex: number): number {
  if (pageIndex <= 0) return 0;
  return Math.floor((pageIndex - 1) / 2) + 1;
}
