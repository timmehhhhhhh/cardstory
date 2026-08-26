import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { WatchlistItem } from "@/lib/pc/types";

/**
 * Server-backed watchlist storage for signed-in users — the only storage
 * this app has for watchlists (see src/middleware.ts; there is no
 * anonymous/local mode anymore). Same "re-check ownership via userId,
 * never trust a bare id" posture as
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
  try {
    await db.watchlistEntry.create({ data: { userId, itemId, kind, priceAtAdd } });
  } catch (err) {
    // P2002 = unique constraint violation (userId_itemId) — already watched,
    // which is the intended idempotent no-op per this function's contract.
    // (Deliberately not db.watchlistEntry.upsert() here: a compound-unique-key
    // upsert can compile to a transactional read-then-write that the Neon HTTP
    // adapter used on Cloudflare Workers can't execute — see src/lib/db.ts.)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return;
    throw err;
  }
}

/**
 * Safe no-op if the item wasn't watched — same idempotency as
 * addWatchlistEntry. `delete` (not `deleteMany`) on the @@unique([userId,
 * itemId]) key, same "Neon HTTP adapter can't do transactions" reasoning as
 * that function's comment — `deleteMany` needs one, a single-row unique
 * `delete` doesn't.
 */
export async function removeWatchlistEntry(userId: string, itemId: string): Promise<void> {
  try {
    await db.watchlistEntry.delete({ where: { userId_itemId: { userId, itemId } } });
  } catch (err) {
    // P2025 = record not found — already not watched, the intended no-op.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") return;
    throw err;
  }
}
