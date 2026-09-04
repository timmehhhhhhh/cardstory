import { BINDER_LAYOUTS, type Binder } from "@/lib/binder/types";

/**
 * Where one holding sits in a LIVE binder — enough to jump straight to that
 * exact pocket (see binderJumpHref) and to describe it in a tooltip/label.
 * Structurally compatible with BinderJumpTarget below (binderId/pageId/
 * slotIndex) and with binder-placement-search.tsx's own PlacementJumpTarget
 * (the same three fields), so a value here can be passed anywhere either of
 * those types is expected without conversion.
 */
export interface LiveBinderPlacement {
  binderId: string;
  binderName: string;
  pageId: string;
  /** 1-based page number within the binder. */
  pageNumber: number;
  slotIndex: number;
  /** 1-based row/column within that page's pocket grid. */
  row: number;
  col: number;
}

/**
 * Where every pc holding currently sits across the user's LIVE binders (see
 * BinderStatus — "live" means the user has confirmed the binder matches
 * their physical one right now). WIP binders are deliberately excluded: a
 * card placed there is only a plan, not something that's actually been
 * filed away yet, so it shouldn't read as "traced" from the PC area.
 *
 * A holding can turn up more than once — a Qty-2+ card placed in two
 * pockets, or filed into more than one live binder — so every placement is
 * kept, in page/pocket order, rather than only the first found. Callers
 * that just need "is this filed, and where" can take index 0.
 *
 * Pure/synchronous over an already-loaded `binders` list (from
 * useBinderStore) — same no-new-endpoint approach as
 * BinderPlacementSearch's own cross-binder scan.
 */
export function findLiveBinderPlacements(binders: Binder[]): Map<string, LiveBinderPlacement[]> {
  const map = new Map<string, LiveBinderPlacement[]>();
  for (const binder of binders) {
    if (binder.status !== "live") continue;
    const cols = BINDER_LAYOUTS[binder.layoutId].cols;
    binder.pages.forEach((page, pageIdx) => {
      page.pockets.forEach((ref, slotIndex) => {
        if (ref?.kind !== "holding") return;
        const placement: LiveBinderPlacement = {
          binderId: binder.id,
          binderName: binder.name,
          pageId: page.id,
          pageNumber: pageIdx + 1,
          slotIndex,
          row: Math.floor(slotIndex / cols) + 1,
          col: (slotIndex % cols) + 1,
        };
        const existing = map.get(ref.holdingId);
        if (existing) existing.push(placement);
        else map.set(ref.holdingId, [placement]);
      });
    });
  }
  return map;
}

/** Deep link that lands BinderClient on this exact pocket — see its `initialJump` prop. */
export function binderJumpHref(basePath: "/binder" | "/business/binder", placement: LiveBinderPlacement): string {
  const params = new URLSearchParams({
    binderId: placement.binderId,
    pageId: placement.pageId,
    slotIndex: String(placement.slotIndex),
  });
  return `${basePath}?${params.toString()}`;
}

/** The minimal fields BinderClient's `initialJump` prop needs — a structural subset of LiveBinderPlacement. */
export interface BinderJumpTarget {
  binderId: string;
  pageId: string;
  slotIndex: number;
}

/**
 * Reverses binderJumpHref: reads the raw ?binderId=&pageId=&slotIndex=
 * query string values (already awaited from Next's `searchParams`) back
 * into a jump target for BinderClient's `initialJump` prop, or null when
 * they're missing/malformed — e.g. a bare "/binder" visit, or a stale/
 * hand-edited link. Shared by both /binder and /business/binder's page.tsx
 * so the two don't each reimplement the same validation.
 */
export function parseBinderJumpParams(params: {
  binderId?: string;
  pageId?: string;
  slotIndex?: string;
}): BinderJumpTarget | null {
  const { binderId, pageId, slotIndex } = params;
  if (!binderId || !pageId || slotIndex == null) return null;
  const parsedSlot = Number(slotIndex);
  if (!Number.isInteger(parsedSlot) || parsedSlot < 0) return null;
  return { binderId, pageId, slotIndex: parsedSlot };
}
