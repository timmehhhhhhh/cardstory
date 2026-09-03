import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";
import {
  pocketCount,
  type Binder,
  type BinderCoverColorId,
  type BinderLayoutId,
  type BinderPage,
  type BinderPocketRef,
  type BinderStatus,
  type PageBackground,
} from "@/lib/binder/types";

/**
 * Server-backed Binder Planner storage for signed-in users — Binder was
 * per-browser-only (a zustand `persist` store writing to localStorage,
 * see the old src/lib/binder/store.ts) until this file gave it real
 * tables, so a binder built on one device now shows up on another. Same
 * "every function takes the requesting userId and re-checks row ownership
 * itself" posture as src/lib/pc/manage.ts — ids here are client-supplied,
 * never trusted from the session alone.
 *
 * Deliberately thin: reflowPages/customSpanCells/overlap validation stay
 * pure client-side functions (see src/lib/binder/remote-store.ts) that run
 * BEFORE a write reaches here — this file persists whatever pockets array
 * the client already validated and computed, it never re-derives binder
 * layout logic itself. That keeps every mutation here a single-row
 * (or small, independent per-row) write, which matters because this app's
 * production Prisma client talks to Neon over PrismaNeonHTTP — no
 * interactive transactions, no updateMany/deleteMany (see src/lib/db.ts).
 */

function toBinderPage(row: { id: string; pockets: unknown }): BinderPage {
  return { id: row.id, pockets: row.pockets as (BinderPocketRef | null)[] };
}

function toBinder(row: {
  id: string;
  name: string;
  layoutId: string;
  coverColor: string;
  pageBackground: string;
  status: string;
  gameFilter: string | null;
  createdAt: Date;
  updatedAt: Date;
  pages: { id: string; sortOrder: number; pockets: unknown }[];
}): Binder {
  return {
    id: row.id,
    name: row.name,
    layoutId: row.layoutId as BinderLayoutId,
    coverColor: row.coverColor as BinderCoverColorId,
    pageBackground: row.pageBackground as PageBackground,
    status: row.status as BinderStatus,
    gameFilter: row.gameFilter,
    pages: row.pages.map(toBinderPage),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** All of a user's binders, each with its pages in page order, oldest-created first. */
export async function listBinders(userId: string): Promise<Binder[]> {
  const rows = await db.binder.findMany({
    where: { userId },
    include: { pages: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toBinder);
}

/**
 * Creates the user's first binder if they somehow have none yet — same
 * deterministic-id + P2002 race handling as ensureDefaultPC in
 * src/lib/pc/manage.ts (see that function's doc comment for why: two
 * concurrent GETs for a brand-new user could otherwise both decide "no
 * binders yet" and both insert one). Silent infra fallback — not logged.
 */
export async function ensureDefaultBinder(userId: string): Promise<Binder> {
  const existing = await db.binder.findFirst({
    where: { userId },
    include: { pages: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return toBinder(existing);

  try {
    // Two separate single-row creates, not a nested `pages: { create }`
    // write — see this file's doc comment on why every mutation here stays
    // one row at a time (no interactive transactions over the Neon HTTP
    // adapter, and Prisma's nested-write creates implicitly need one).
    const created = await db.binder.create({ data: { id: `default-${userId}`, userId, name: "My Binder" } });
    const page = await db.binderPage.create({
      data: { id: `default-${userId}-p1`, binderId: created.id, sortOrder: 0, pockets: Array(pocketCount("9")).fill(null) },
    });
    return toBinder({ ...created, pages: [page] });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const winner = await db.binder.findFirst({
        where: { userId },
        include: { pages: { orderBy: { sortOrder: "asc" } } },
        orderBy: { createdAt: "asc" },
      });
      if (winner) return toBinder(winner);
    }
    throw err;
  }
}

export async function createBinder(
  userId: string,
  binder: {
    id: string;
    name: string;
    layoutId: BinderLayoutId;
    coverColor?: BinderCoverColorId;
    pageBackground?: PageBackground;
    status?: BinderStatus;
    gameFilter?: string | null;
    pages: { id: string; pockets: (BinderPocketRef | null)[] }[];
  }
): Promise<void> {
  // Parent row first, then each page as its own single-row create — see
  // this file's doc comment (no nested writes; Neon's HTTP adapter can't
  // support the interactive transaction those implicitly need).
  await db.binder.create({
    data: {
      id: binder.id,
      userId,
      name: binder.name,
      layoutId: binder.layoutId,
      coverColor: binder.coverColor,
      pageBackground: binder.pageBackground,
      status: binder.status,
      gameFilter: binder.gameFilter,
    },
  });
  await Promise.all(
    binder.pages.map((p, i) => db.binderPage.create({ data: { id: p.id, binderId: binder.id, sortOrder: i, pockets: p.pockets } }))
  );
  await logActivity(userId, {
    action: "binder.created",
    entityType: "binder",
    entityId: binder.id,
    summary: `Created binder "${binder.name}"`,
  });
}

async function assertOwnsBinder(userId: string, binderId: string): Promise<{ id: string; name: string }> {
  const binder = await db.binder.findUnique({ where: { id: binderId }, select: { id: true, userId: true, name: true } });
  if (!binder || binder.userId !== userId) {
    throw new Error("Binder not found");
  }
  return { id: binder.id, name: binder.name };
}

export async function renameBinder(userId: string, binderId: string, name: string): Promise<void> {
  const binder = await assertOwnsBinder(userId, binderId);
  await db.binder.update({ where: { id: binderId }, data: { name } });
  if (name !== binder.name) {
    await logActivity(userId, {
      action: "binder.renamed",
      entityType: "binder",
      entityId: binderId,
      summary: `Renamed binder "${binder.name}" to "${name}"`,
    });
  }
}

export async function deleteBinder(userId: string, binderId: string): Promise<void> {
  const binder = await assertOwnsBinder(userId, binderId);
  await db.binder.delete({ where: { id: binderId } });
  await logActivity(userId, {
    action: "binder.deleted",
    entityType: "binder",
    entityId: binderId,
    summary: `Deleted binder "${binder.name}"`,
  });
}

export async function setCoverColor(userId: string, binderId: string, coverColor: BinderCoverColorId): Promise<void> {
  await assertOwnsBinder(userId, binderId);
  await db.binder.update({ where: { id: binderId }, data: { coverColor } });
}

export async function setPageBackground(userId: string, binderId: string, pageBackground: PageBackground): Promise<void> {
  await assertOwnsBinder(userId, binderId);
  await db.binder.update({ where: { id: binderId }, data: { pageBackground } });
}

export async function setStatus(userId: string, binderId: string, status: BinderStatus): Promise<void> {
  await assertOwnsBinder(userId, binderId);
  await db.binder.update({ where: { id: binderId }, data: { status } });
}

export async function setGameFilter(userId: string, binderId: string, gameFilter: string | null): Promise<void> {
  await assertOwnsBinder(userId, binderId);
  await db.binder.update({ where: { id: binderId }, data: { gameFilter } });
}

/**
 * Persists a layout change plus the already-reflowed `pages` the client
 * computed (see reflowPages in remote-store.ts — this function never
 * re-derives that logic). Reconciles the binder's page set against the new
 * list by id: existing ids are updated in place, ids no longer present are
 * deleted, new ids are created — one row at a time (no updateMany/
 * deleteMany/transaction; see this file's doc comment).
 */
export async function setLayout(
  userId: string,
  binderId: string,
  layoutId: BinderLayoutId,
  pages: { id: string; pockets: (BinderPocketRef | null)[] }[]
): Promise<void> {
  await assertOwnsBinder(userId, binderId);
  const existing = await db.binderPage.findMany({ where: { binderId }, select: { id: true } });
  const existingIds = new Set(existing.map((p) => p.id));
  const nextIds = new Set(pages.map((p) => p.id));

  await db.binder.update({ where: { id: binderId }, data: { layoutId } });

  await Promise.all([
    ...pages.map((p, i) =>
      existingIds.has(p.id)
        ? db.binderPage.update({ where: { id: p.id }, data: { sortOrder: i, pockets: p.pockets } })
        : db.binderPage.create({ data: { id: p.id, binderId, sortOrder: i, pockets: p.pockets } })
    ),
    ...existing.filter((p) => !nextIds.has(p.id)).map((p) => db.binderPage.delete({ where: { id: p.id } })),
  ]);
}

export async function addPage(
  userId: string,
  binderId: string,
  pageId: string,
  pockets: (BinderPocketRef | null)[]
): Promise<void> {
  await assertOwnsBinder(userId, binderId);
  const count = await db.binderPage.count({ where: { binderId } });
  await db.binderPage.create({ data: { id: pageId, binderId, sortOrder: count, pockets } });
}

/**
 * Removes one page. `fallbackPage`, when given, is created in the same
 * call — the client sends it whenever this removal would otherwise leave
 * the binder with zero pages, mirroring the local store's "a binder always
 * has at least one page" invariant (see removePage in the old store.ts).
 */
export async function removePage(
  userId: string,
  binderId: string,
  pageId: string,
  fallbackPage?: { id: string; pockets: (BinderPocketRef | null)[] }
): Promise<void> {
  await assertOwnsBinder(userId, binderId);
  const page = await db.binderPage.findUnique({ where: { id: pageId }, select: { binderId: true } });
  if (!page || page.binderId !== binderId) throw new Error("Page not found");
  await db.binderPage.delete({ where: { id: pageId } });
  if (fallbackPage) {
    await db.binderPage.create({ data: { id: fallbackPage.id, binderId, sortOrder: 0, pockets: fallbackPage.pockets } });
  }
}

export async function updatePagePockets(
  userId: string,
  binderId: string,
  pageId: string,
  pockets: (BinderPocketRef | null)[]
): Promise<void> {
  await assertOwnsBinder(userId, binderId);
  const page = await db.binderPage.findUnique({ where: { id: pageId }, select: { binderId: true } });
  if (!page || page.binderId !== binderId) throw new Error("Page not found");
  await db.binderPage.update({ where: { id: pageId }, data: { pockets } });
}

/**
 * Nulls out every pocket referencing `holdingId` across every one of the
 * user's binders — the server-side counterpart of the old local store's
 * removeHoldingEverywhere. Intended to run whenever a holding is deleted
 * from the pc (see deleteBinder-adjacent callers); scans all pages since a
 * holding can be placed in more than one binder/page.
 */
export async function removeHoldingEverywhere(userId: string, holdingId: string): Promise<void> {
  const pages = await db.binderPage.findMany({
    where: { binder: { userId } },
    select: { id: true, pockets: true },
  });
  const affected = pages.filter((p) =>
    (p.pockets as (BinderPocketRef | null)[]).some((ref) => ref?.kind === "holding" && ref.holdingId === holdingId)
  );
  await Promise.all(
    affected.map((p) =>
      db.binderPage.update({
        where: { id: p.id },
        data: {
          pockets: (p.pockets as (BinderPocketRef | null)[]).map((ref) =>
            ref?.kind === "holding" && ref.holdingId === holdingId ? null : ref
          ),
        },
      })
    )
  );
}

export async function getPreferences(
  userId: string
): Promise<{ activeBinderId: string | null; showNumberTags: boolean; showNotOwnedTags: boolean }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { activeBinderId: true, showNumberTags: true, showNotOwnedTags: true },
  });
  return {
    activeBinderId: user?.activeBinderId ?? null,
    showNumberTags: user?.showNumberTags ?? true,
    showNotOwnedTags: user?.showNotOwnedTags ?? true,
  };
}

export async function setPreferences(
  userId: string,
  patch: { activeBinderId?: string; showNumberTags?: boolean; showNotOwnedTags?: boolean }
): Promise<void> {
  await db.user.update({ where: { id: userId }, data: patch });
}

/**
 * One-time import of a browser's entire local binder payload into the
 * user's account, preserving ids so the caller's optimistic client state
 * doesn't need to change shape — same idempotent-upsert pattern as
 * importLocalPC in src/lib/pc/manage.ts. Each binder's page set is
 * upserted by id the same way setLayout reconciles one above.
 */
export async function importLocalBinders(
  userId: string,
  binders: {
    id: string;
    name: string;
    layoutId: BinderLayoutId;
    coverColor: BinderCoverColorId;
    pageBackground: PageBackground;
    status: BinderStatus;
    pages: { id: string; pockets: (BinderPocketRef | null)[] }[];
  }[]
): Promise<void> {
  const importedIds: string[] = [];

  for (const b of binders) {
    importedIds.push(b.id);
    await db.binder.upsert({
      where: { id: b.id },
      create: {
        id: b.id,
        userId,
        name: b.name,
        layoutId: b.layoutId,
        coverColor: b.coverColor,
        pageBackground: b.pageBackground,
        status: b.status,
      },
      update: {},
    });
    await Promise.all(
      b.pages.map((p, i) =>
        db.binderPage.upsert({
          where: { id: p.id },
          create: { id: p.id, binderId: b.id, sortOrder: i, pockets: p.pockets },
          update: {},
        })
      )
    );
  }

  // GET /api/binder (ensureDefaultBinder) may have already created an
  // empty "My Binder" for this user before the import prompt was
  // answered — same race as importLocalPC's cleanup in src/lib/pc/manage.ts.
  // Clean up any such empty stragglers now that real data has landed.
  if (importedIds.length > 0) {
    const candidates = await db.binder.findMany({
      where: { userId, id: { notIn: importedIds } },
      select: { id: true, pages: { select: { pockets: true } } },
    });
    const empty = candidates.filter((b) =>
      b.pages.every((p) => (p.pockets as unknown[]).every((v) => v == null))
    );
    await Promise.all(empty.map((b) => db.binder.delete({ where: { id: b.id } })));
  }

  if (importedIds.length > 0) {
    await logActivity(userId, {
      action: "binder.imported",
      entityType: "binder",
      summary: `Imported ${importedIds.length} binder${importedIds.length === 1 ? "" : "s"}`,
      metadata: { binderIds: importedIds },
    });
  }
}
