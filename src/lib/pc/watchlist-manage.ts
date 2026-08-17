import { db } from "@/lib/db";
import type { WatchlistItem } from "@/lib/pc/types";

/**
 * Server-backed watchlist storage for signed-in users — the accounts
 * equivalent of the `watchlist` slice of src/lib/pc/local-store.ts. Same
 * "re-check ownership via userId, never trust a bare id" posture as
 * src/lib/pc/manage.ts, though there's nothing to own-check here beyond
 * scoping every query to the caller's own userId.
 *
 * Not wired into the account menu's History feed (src/lib/activity/log.ts)
 * — a single star-toggle click is too frequent/low-stakes for that log,
 * unlike a full Add-to-PC form submission.
 */

export async function listWatchlist(userId: string): Promise<WatchlistItem[]> {
  const rows = await db.watchlistEntry.findMany({
    where: { userId },
    orderBy: { addedAt: "desc" },
  });
  return rows.map((r) => ({
    itemId: r.itemId,
    kind: r.kind as WatchlistItem["kind"],
    addedAt: r.addedAt.toISOString(),
    priceAtAdd: r.priceAtAdd != null ? Number(r.priceAtAdd) : null,
  }));
}

/** Idempotent — starring an already-watched item is a safe no-op, not an error. */
export async function addWatchlistEntry(
  userId: string,
  itemId: string,
  kind: WatchlistItem["kind"],
  priceAtAdd: number | null
): Promise<void> {
  await db.watchlistEntry.upsert({
    where: { userId_itemId: { userId, itemId } },
    create: { userId, itemId, kind, priceAtAdd },
    update: {},
  });
}

/** Safe no-op if the item wasn't watched — same idempotency as addWatchlistEntry. */
export async function removeWatchlistEntry(userId: string, itemId: string): Promise<void> {
  await db.watchlistEntry.deleteMany({ where: { userId, itemId } });
}
