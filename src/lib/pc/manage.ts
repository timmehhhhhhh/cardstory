import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";
import type { Holding, NewHoldingInput, PC } from "@/lib/pc/types";
import type { LetGoDetails } from "@/lib/pc/api-schemas";

/**
 * Server-backed PC storage for signed-in users — the accounts
 * equivalent of src/lib/pc/local-store.ts. Every function here
 * takes the requesting userId and re-checks row ownership itself (never
 * trusting that a valid session alone means the caller owns the
 * PC/holding id in question — those ids are client-supplied).
 *
 * The underlying Prisma model/table/columns are still named
 * Portfolio/portfolios/portfolioId (see prisma/schema.prisma) — only the
 * user-facing "PC" branding and the rest of the app's code changed, not
 * the database, so this file is the deliberate seam where "portfolio"
 * naming still appears wherever it talks directly to Prisma.
 *
 * Every user-intentional mutation here also writes a best-effort entry to
 * the account menu's History feed (src/lib/activity/log.ts) — this is the
 * one place every /api/pc/** route funnels through, so it's the one place
 * to log rather than touching every route file. ensureDefaultPC is the
 * one exception: it's a silent infra fallback (auto-creating a "Main" PC
 * the first time a user is fetched), not something the user asked for, so
 * it's deliberately not logged.
 */

function toHolding(row: {
  id: string;
  kind: string;
  catalogItemId: string | null;
  sportsCardItemId: string | null;
  quantity: number;
  condition: string;
  gradeCompany: string | null;
  gradeValue: string | null;
  rawCondition: string | null;
  serialNumber: string | null;
  language: string;
  customName: string | null;
  costBasisTotal: unknown;
  costBasisCurrency: string;
  priceAtAcquisition: unknown;
  acquiredAt: Date | null;
  notes: string | null;
  imageUrl: string | null;
  archivedAt: Date | null;
  letGoAt: Date | null;
  letGoMethod: string | null;
  letGoTo: string | null;
  letGoAmount: unknown;
  letGoCurrency: string | null;
  letGoNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Holding {
  return {
    id: row.id,
    kind: row.kind as Holding["kind"],
    catalogItemId: row.catalogItemId ?? undefined,
    sportsCardItemId: row.sportsCardItemId ?? undefined,
    quantity: row.quantity,
    condition: row.condition as Holding["condition"],
    gradeCompany: row.gradeCompany ?? undefined,
    gradeValue: row.gradeValue ?? undefined,
    rawCondition: (row.rawCondition as Holding["rawCondition"]) ?? undefined,
    serialNumber: row.serialNumber ?? undefined,
    language: row.language as Holding["language"],
    customName: row.customName ?? undefined,
    costBasisTotal: Number(row.costBasisTotal),
    costBasisCurrency: row.costBasisCurrency as Holding["costBasisCurrency"],
    priceAtAcquisition: row.priceAtAcquisition != null ? Number(row.priceAtAcquisition) : undefined,
    acquiredAt: row.acquiredAt ? row.acquiredAt.toISOString() : null,
    notes: row.notes ?? undefined,
    imageUrl: row.imageUrl ?? undefined,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    letGoAt: row.letGoAt ? row.letGoAt.toISOString() : null,
    letGoMethod: (row.letGoMethod as Holding["letGoMethod"]) ?? undefined,
    letGoTo: row.letGoTo ?? undefined,
    letGoAmount: row.letGoAmount != null ? Number(row.letGoAmount) : undefined,
    letGoCurrency: (row.letGoCurrency as Holding["letGoCurrency"]) ?? undefined,
    letGoNotes: row.letGoNotes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** "2x Charizard VMAX" vs just "Charizard VMAX" for a single copy. */
function formatQuantityLabel(quantity: number, name: string): string {
  return quantity > 1 ? `${quantity}x ${name}` : name;
}

/**
 * Human-readable card name for an activity-log summary — same "playerName
 * — parallelName" convention already used for sports cards elsewhere (see
 * src/lib/catalog/search.ts, src/app/card/[game]/[cardId]/page.tsx). A
 * single indexed PK lookup, same "batch lookup, not a join" convention the
 * Holding model comment documents.
 */
async function resolveItemName(
  kind: string,
  catalogItemId: string | null | undefined,
  sportsCardItemId: string | null | undefined,
  customName?: string | null
): Promise<string> {
  // A hand-keyed holding has no catalog row to look up — its own name is
  // all there is, and it's what the user typed, so it reads best anyway.
  if (customName && !catalogItemId && !sportsCardItemId) return customName;
  if (kind === "sports" && sportsCardItemId) {
    const item = await db.sportsCardItem.findUnique({
      where: { id: sportsCardItemId },
      select: { playerName: true, parallelName: true },
    });
    if (!item) return "a card";
    return item.parallelName ? `${item.playerName} — ${item.parallelName}` : item.playerName;
  }
  if (catalogItemId) {
    const item = await db.catalogItem.findUnique({ where: { id: catalogItemId }, select: { name: true } });
    return item?.name ?? "a card";
  }
  return "a card";
}

/** All of a user's PCs, each with its holdings, oldest-created first. */
export async function listPCs(userId: string): Promise<PC[]> {
  const rows = await db.portfolio.findMany({
    where: { userId },
    include: { holdings: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    kind: p.kind as PC["kind"],
    createdAt: p.createdAt.toISOString(),
    holdings: p.holdings.map(toHolding),
  }));
}

/** Creates the user's first PC if they somehow have none yet. Silent infra fallback — not logged. */
export async function ensureDefaultPC(userId: string): Promise<PC> {
  const existing = await db.portfolio.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
  if (existing)
    return {
      id: existing.id,
      name: existing.name,
      kind: existing.kind as PC["kind"],
      createdAt: existing.createdAt.toISOString(),
      holdings: [],
    };
  const created = await db.portfolio.create({ data: { userId, name: "Main" } });
  return {
    id: created.id,
    name: created.name,
    kind: created.kind as PC["kind"],
    createdAt: created.createdAt.toISOString(),
    holdings: [],
  };
}

export async function createPC(
  userId: string,
  id: string,
  name: string,
  kind?: "personal" | "business"
): Promise<void> {
  await db.portfolio.create({ data: { id, userId, name, kind } });
  await logActivity(userId, {
    action: "pc.created",
    entityType: "pc",
    entityId: id,
    summary: `Created PC "${name}"`,
  });
}

async function assertOwnsPC(
  userId: string,
  pcId: string
): Promise<{ id: string; name: string; kind: string }> {
  const pc = await db.portfolio.findUnique({
    where: { id: pcId },
    select: { id: true, userId: true, name: true, kind: true },
  });
  if (!pc || pc.userId !== userId) {
    throw new Error("PC not found");
  }
  return { id: pc.id, name: pc.name, kind: pc.kind };
}

export async function renamePC(userId: string, pcId: string, name: string): Promise<void> {
  const pc = await assertOwnsPC(userId, pcId);
  await db.portfolio.update({ where: { id: pcId }, data: { name } });
  if (name !== pc.name) {
    await logActivity(userId, {
      action: "pc.renamed",
      entityType: "pc",
      entityId: pcId,
      summary: `Renamed PC "${pc.name}" to "${name}"`,
    });
  }
}

export async function deletePC(userId: string, pcId: string): Promise<void> {
  const pc = await assertOwnsPC(userId, pcId);

  // Archived holdings are meant to survive forever (that's the whole point
  // of PC Archives/Business Archives) — Holding.portfolioId cascades on
  // delete, so an archived row left in this pc would otherwise be silently
  // destroyed along with it. Hand any archived rows off to another pc of
  // the same kind first; if there isn't one, refuse the delete rather than
  // losing that history.
  const archived = await db.holding.findMany({
    where: { portfolioId: pcId, archivedAt: { not: null } },
    select: { id: true },
  });
  if (archived.length > 0) {
    const fallback = await db.portfolio.findFirst({
      where: { userId, kind: pc.kind, id: { not: pcId } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!fallback) {
      throw new Error("PC has archived cards");
    }
    // One `update` per row rather than a single `updateMany` — see
    // archiveHoldings' comment below for why: `updateMany`/`deleteMany`
    // need an interactive transaction under the Neon HTTP adapter this app
    // runs on in production, which that adapter can't provide.
    await Promise.all(
      archived.map((h) => db.holding.update({ where: { id: h.id }, data: { portfolioId: fallback.id } }))
    );
  }

  await db.portfolio.delete({ where: { id: pcId } });
  await logActivity(userId, {
    action: "pc.deleted",
    entityType: "pc",
    entityId: pcId,
    summary: `Deleted PC "${pc.name}"`,
  });
}

export async function addHolding(
  userId: string,
  pcId: string,
  input: NewHoldingInput & { id: string }
): Promise<void> {
  const pc = await assertOwnsPC(userId, pcId);
  await db.holding.create({
    data: {
      id: input.id,
      portfolioId: pcId,
      kind: input.kind ?? "tcg",
      catalogItemId: input.catalogItemId,
      sportsCardItemId: input.sportsCardItemId,
      quantity: input.quantity,
      condition: input.condition,
      gradeCompany: input.gradeCompany,
      gradeValue: input.gradeValue,
      rawCondition: input.rawCondition,
      serialNumber: input.serialNumber,
      language: input.language,
      customName: input.customName,
      costBasisTotal: input.costBasisTotal,
      costBasisCurrency: input.costBasisCurrency,
      priceAtAcquisition: input.priceAtAcquisition,
      acquiredAt: input.acquiredAt ? new Date(input.acquiredAt) : null,
      notes: input.notes,
      imageUrl: input.imageUrl,
    },
  });

  const itemName = await resolveItemName(input.kind ?? "tcg", input.catalogItemId, input.sportsCardItemId, input.customName);
  await logActivity(userId, {
    action: "holding.added",
    entityType: "holding",
    entityId: input.id,
    summary: `Added ${formatQuantityLabel(input.quantity, itemName)} to ${pc.name}`,
    metadata: { pcId, quantity: input.quantity, condition: input.condition },
  });
}

async function assertOwnsHolding(userId: string, holdingId: string) {
  const holding = await db.holding.findUnique({
    where: { id: holdingId },
    select: {
      kind: true,
      catalogItemId: true,
      sportsCardItemId: true,
      customName: true,
      portfolio: { select: { userId: true, name: true } },
    },
  });
  if (!holding || holding.portfolio.userId !== userId) {
    throw new Error("Holding not found");
  }
  return holding;
}

export async function updateHolding(
  userId: string,
  holdingId: string,
  patch: Partial<Omit<Holding, "id">>
): Promise<void> {
  const holding = await assertOwnsHolding(userId, holdingId);
  const { acquiredAt, archivedAt, letGoAt, ...rest } = patch;
  await db.holding.update({
    where: { id: holdingId },
    data: {
      ...rest,
      // Distinguish "not present in the patch" (undefined — leave alone)
      // from "explicitly cleared" (null) from "set to a date" (string) —
      // a plain `acquiredAt ? {...} : {}` would silently drop an explicit
      // null and never actually clear the date. Same reasoning applies to
      // archivedAt/letGoAt below: a "restore" patch explicitly clears both
      // with null (see restoreHolding-style calls from the Archives UI).
      ...(acquiredAt !== undefined ? { acquiredAt: acquiredAt ? new Date(acquiredAt) : null } : {}),
      ...(archivedAt !== undefined ? { archivedAt: archivedAt ? new Date(archivedAt) : null } : {}),
      ...(letGoAt !== undefined ? { letGoAt: letGoAt ? new Date(letGoAt) : null } : {}),
    },
  });

  const itemName = await resolveItemName(holding.kind, holding.catalogItemId, holding.sportsCardItemId, holding.customName);
  await logActivity(userId, {
    action: "holding.updated",
    entityType: "holding",
    entityId: holdingId,
    summary: `Updated ${itemName} in ${holding.portfolio.name}`,
    metadata: { changedFields: Object.keys(patch) },
  });
}

/**
 * Soft-deletes holdings out of the active PC into its Archives — the
 * everyday "remove a card" path (item-grid/item-gallery trash icon,
 * BulkActionsBar's Delete button). Unlike removeHoldings below, this never
 * touches the row itself beyond stamping the archive columns, so every
 * acquisition detail (acquiredAt, costBasisTotal, notes, imageUrl…) stays
 * intact for PC Archives / Business Archives to show later. `letGo` is
 * entirely optional — a user can archive with zero details and fill them
 * in from Archives whenever the card turns out to matter to them.
 */
export async function archiveHoldings(
  userId: string,
  pcId: string,
  holdingIds: string[],
  letGo?: LetGoDetails
): Promise<void> {
  const pc = await assertOwnsPC(userId, pcId);
  const holdings = await db.holding.findMany({
    where: { portfolioId: pcId, id: { in: holdingIds } },
    select: { id: true, kind: true, catalogItemId: true, sportsCardItemId: true, customName: true, quantity: true },
  });
  if (holdings.length === 0) return;

  const letGoAt = letGo?.letGoAt ? new Date(letGo.letGoAt) : new Date();
  const archiveData = {
    archivedAt: new Date(),
    letGoAt,
    // Explicit nulls (not undefined) for anything left blank — this is
    // the authoritative write of a fresh archive record, so a previous
    // restore/re-archive cycle's stale letGo* values must actually be
    // overwritten rather than left as whatever Prisma's "undefined means
    // don't touch" default would otherwise preserve.
    letGoMethod: letGo?.letGoMethod ?? null,
    letGoTo: letGo?.letGoTo ?? null,
    letGoAmount: letGo?.letGoAmount ?? null,
    letGoCurrency: letGo?.letGoCurrency ?? null,
    letGoNotes: letGo?.letGoNotes ?? null,
  };
  // One `update` per row rather than a single `updateMany` — this app's
  // production Prisma client (src/lib/db.ts) talks to Neon over
  // PrismaNeonHTTP, a plain-fetch adapter that deliberately can't support
  // interactive transactions (see that file's comment). `updateMany`
  // internally requires one, so it fails there with "Transactions are not
  // supported in HTTP mode" — a single-row `update` doesn't.
  await Promise.all(holdings.map((h) => db.holding.update({ where: { id: h.id }, data: archiveData })));

  let summary: string;
  if (holdings.length <= 5) {
    const names = await Promise.all(
      holdings.map((h) => resolveItemName(h.kind, h.catalogItemId, h.sportsCardItemId, h.customName))
    );
    const list = holdings.map((h, i) => formatQuantityLabel(h.quantity, names[i])).join(", ");
    summary = `Archived ${list} from ${pc.name}`;
  } else {
    summary = `Archived ${holdings.length} cards from ${pc.name}`;
  }
  await logActivity(userId, {
    action: "holding.archived",
    entityType: "holding",
    summary,
    metadata: { pcId, holdingIds },
  });
}

export async function removeHoldings(userId: string, pcId: string, holdingIds: string[]): Promise<void> {
  const pc = await assertOwnsPC(userId, pcId);
  const holdings = await db.holding.findMany({
    where: { portfolioId: pcId, id: { in: holdingIds } },
    select: { id: true, kind: true, catalogItemId: true, sportsCardItemId: true, customName: true, quantity: true },
  });
  if (holdings.length === 0) return;

  // Per-row `delete` rather than `deleteMany` — same "no interactive
  // transactions over the Neon HTTP adapter" reasoning as archiveHoldings
  // above.
  await Promise.all(holdings.map((h) => db.holding.delete({ where: { id: h.id } })));

  let summary: string;
  if (holdings.length <= 5) {
    const names = await Promise.all(
      holdings.map((h) => resolveItemName(h.kind, h.catalogItemId, h.sportsCardItemId, h.customName))
    );
    const list = holdings.map((h, i) => formatQuantityLabel(h.quantity, names[i])).join(", ");
    summary = `Removed ${list} from ${pc.name}`;
  } else {
    summary = `Removed ${holdings.length} cards from ${pc.name}`;
  }
  await logActivity(userId, {
    action: "holding.deleted",
    entityType: "holding",
    summary,
    metadata: { pcId, holdingIds },
  });
}

export async function transferHoldings(
  userId: string,
  fromId: string,
  toId: string,
  holdingIds: string[],
  mode: "copy" | "move"
): Promise<void> {
  const fromPc = await assertOwnsPC(userId, fromId);
  const toPc = await assertOwnsPC(userId, toId);

  const holdings = await db.holding.findMany({ where: { portfolioId: fromId, id: { in: holdingIds } } });

  // Not wrapped in `db.$transaction` — this app's production Prisma client
  // (src/lib/db.ts) talks to Neon over PrismaNeonHTTP, a plain-fetch
  // adapter that can't support interactive transactions at all ("Transactions
  // are not supported in HTTP mode"), so `$transaction` throws unconditionally
  // there. Each create/delete below is already a single-row operation and
  // needs no transaction of its own; a failure partway through just leaves
  // the transfer partially done rather than rolled back, same tradeoff
  // archiveHoldings/removeHoldings above already accept.
  for (const h of holdings) {
    await db.holding.create({
      data: {
        portfolioId: toId,
        kind: h.kind,
        catalogItemId: h.catalogItemId,
        sportsCardItemId: h.sportsCardItemId,
        quantity: h.quantity,
        condition: h.condition,
        gradeCompany: h.gradeCompany,
        gradeValue: h.gradeValue,
        rawCondition: h.rawCondition,
        serialNumber: h.serialNumber,
        language: h.language,
        customName: h.customName,
        costBasisTotal: h.costBasisTotal,
        costBasisCurrency: h.costBasisCurrency,
        priceAtAcquisition: h.priceAtAcquisition,
        acquiredAt: h.acquiredAt,
        notes: h.notes,
        imageUrl: h.imageUrl,
      },
    });
  }
  if (mode === "move") {
    await Promise.all(holdings.map((h) => db.holding.delete({ where: { id: h.id } })));
  }

  if (holdings.length > 0) {
    await logActivity(userId, {
      action: "holding.transferred",
      entityType: "holding",
      summary: `${mode === "move" ? "Moved" : "Copied"} ${holdings.length} card${holdings.length === 1 ? "" : "s"} from ${fromPc.name} to ${toPc.name}`,
      metadata: { fromId, toId, holdingIds, mode },
    });
  }
}
