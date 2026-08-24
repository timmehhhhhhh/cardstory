import { db } from "@/lib/db";
import type { ShortlistItem, ShortlistItemKind } from "@/lib/shortlist/types";
import type { ShortlistItemInput, ShortlistItemPatchInput } from "@/lib/shortlist/api-schemas";

/**
 * Server-backed In-Store Shortlist storage for signed-in users — the only
 * storage this app has for shortlists (see src/proxy.ts; there is no
 * anonymous/local mode anymore). Same "re-check ownership via userId,
 * never trust a bare id" posture as
 * src/lib/pc/manage.ts for the one mutation where it matters (update —
 * see assertOwnsShortlistItem).
 *
 * Deliberately NOT wired into the account menu's History feed
 * (src/lib/activity/log.ts). Adding and deleting maybe-purchases is
 * high-frequency scratchpad churn while shopping, not an account event —
 * unlike watchlist stars, this could be dozens of edits in ten minutes.
 * The event that actually matters, the purchase, is already logged as
 * "holding.added" by src/lib/pc/manage.ts's addHolding once per card
 * checked out. Logging shortlist churn too would also force new keys into
 * CATEGORY_ACTIONS (src/lib/activity/categories.ts) for no reader value.
 */

function toShortlistItem(row: {
  id: string;
  kind: string;
  catalogItemId: string | null;
  sportsCardItemId: string | null;
  customName: string | null;
  customSubtitle: string | null;
  quantity: number;
  askingPrice: unknown;
  askingCurrency: string;
  notes: string | null;
  source: string | null;
  addedAt: Date;
  updatedAt: Date;
}): ShortlistItem {
  return {
    id: row.id,
    kind: row.kind as ShortlistItemKind,
    catalogItemId: row.catalogItemId ?? undefined,
    sportsCardItemId: row.sportsCardItemId ?? undefined,
    customName: row.customName ?? undefined,
    customSubtitle: row.customSubtitle ?? undefined,
    quantity: row.quantity,
    askingPrice: Number(row.askingPrice),
    askingCurrency: row.askingCurrency as ShortlistItem["askingCurrency"],
    notes: row.notes ?? undefined,
    source: row.source ?? undefined,
    addedAt: row.addedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listShortlist(userId: string): Promise<ShortlistItem[]> {
  const rows = await db.shortlistItem.findMany({
    where: { userId },
    orderBy: { addedAt: "desc" },
  });
  return rows.map(toShortlistItem);
}

export async function addShortlistItem(userId: string, input: ShortlistItemInput): Promise<void> {
  await db.shortlistItem.create({
    data: {
      id: input.id,
      userId,
      kind: input.kind,
      catalogItemId: input.catalogItemId,
      sportsCardItemId: input.sportsCardItemId,
      customName: input.customName,
      customSubtitle: input.customSubtitle,
      quantity: input.quantity,
      askingPrice: input.askingPrice,
      askingCurrency: input.askingCurrency,
      notes: input.notes,
      source: input.source,
    },
  });
}

/**
 * Idempotent create-or-skip for the logged-out -> logged-in import path
 * (see /api/pc/import) — id-keyed so re-running an accepted import prompt
 * twice can't duplicate rows, same story as importLocalPC's holdings.
 */
export async function upsertShortlistItem(userId: string, input: ShortlistItemInput): Promise<void> {
  await db.shortlistItem.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      userId,
      kind: input.kind,
      catalogItemId: input.catalogItemId,
      sportsCardItemId: input.sportsCardItemId,
      customName: input.customName,
      customSubtitle: input.customSubtitle,
      quantity: input.quantity,
      askingPrice: input.askingPrice,
      askingCurrency: input.askingCurrency,
      notes: input.notes,
      source: input.source,
    },
    update: {},
  });
}

/** Ids are client-supplied, so update needs an explicit ownership check unlike delete's inherently-scoped deleteMany. */
async function assertOwnsShortlistItem(userId: string, itemId: string) {
  const row = await db.shortlistItem.findUnique({ where: { id: itemId }, select: { userId: true } });
  if (!row || row.userId !== userId) throw new Error("Shortlist item not found");
}

export async function updateShortlistItem(
  userId: string,
  itemId: string,
  patch: ShortlistItemPatchInput
): Promise<void> {
  await assertOwnsShortlistItem(userId, itemId);
  await db.shortlistItem.update({ where: { id: itemId }, data: patch });
}

/** Scoped by userId in the where clause, same posture as removeWatchlistEntry — silently no-ops on someone else's id rather than needing a per-id ownership check. */
export async function removeShortlistItems(userId: string, itemIds: string[]): Promise<void> {
  await db.shortlistItem.deleteMany({ where: { userId, id: { in: itemIds } } });
}
