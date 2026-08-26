import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";
import { DEFAULT_CURATED_SET_FILTERS, type CuratedSet, type CuratedSetFilters } from "@/lib/curated-sets/types";

/**
 * Server-backed storage for the Curated Sets feature (src/app/curated-sets)
 * — directly modeled on src/lib/views/manage.ts. Account-only, no
 * local/guest counterpart. Every function re-checks row ownership itself
 * (assertOwnsCuratedSet) since ids are client-supplied, and every
 * user-intentional mutation writes a best-effort History entry (see
 * src/lib/activity/log.ts), same convention as views/manage.ts.
 */

function toCuratedSet(row: {
  id: string;
  name: string;
  filters: unknown;
  targetQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}): CuratedSet {
  return {
    id: row.id,
    name: row.name,
    // filters was validated by curatedSetFiltersSchema (api-schemas.ts)
    // before every write, so a plain merge-over-defaults is trusted here
    // rather than re-parsing on every read — same convention as
    // views/manage.ts's toSavedView.
    filters: { ...DEFAULT_CURATED_SET_FILTERS, ...(row.filters as Partial<CuratedSetFilters>) },
    targetQuantity: row.targetQuantity,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** All of a user's curated sets, oldest-created first. */
export async function listCuratedSets(userId: string): Promise<CuratedSet[]> {
  const rows = await db.curatedSet.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toCuratedSet);
}

export async function createCuratedSet(
  userId: string,
  id: string,
  name: string,
  filters: CuratedSetFilters,
  targetQuantity: number
): Promise<CuratedSet> {
  const row = await db.curatedSet.create({
    data: { id, userId, name, filters: filters as unknown as Prisma.InputJsonValue, targetQuantity },
  });
  await logActivity(userId, {
    action: "curatedset.created",
    entityType: "curatedset",
    entityId: id,
    summary: `Created Curated Set "${name}"`,
  });
  return toCuratedSet(row);
}

async function assertOwnsCuratedSet(
  userId: string,
  curatedSetId: string
): Promise<{ id: string; name: string }> {
  const set = await db.curatedSet.findUnique({
    where: { id: curatedSetId },
    select: { id: true, userId: true, name: true },
  });
  if (!set || set.userId !== userId) {
    throw new Error("Curated set not found");
  }
  return { id: set.id, name: set.name };
}

/** Server-side lookup used by the /matches route — throws if not owned. */
export async function getCuratedSet(userId: string, curatedSetId: string): Promise<CuratedSet> {
  const row = await db.curatedSet.findUnique({ where: { id: curatedSetId } });
  if (!row || row.userId !== userId) {
    throw new Error("Curated set not found");
  }
  return toCuratedSet(row);
}

export async function updateCuratedSet(
  userId: string,
  curatedSetId: string,
  update: { name?: string; filters?: CuratedSetFilters; targetQuantity?: number }
): Promise<void> {
  const set = await assertOwnsCuratedSet(userId, curatedSetId);
  await db.curatedSet.update({
    where: { id: curatedSetId },
    data: {
      name: update.name,
      filters: update.filters ? (update.filters as unknown as Prisma.InputJsonValue) : undefined,
      targetQuantity: update.targetQuantity,
    },
  });
  const changed =
    update.name !== undefined
      ? `Renamed Curated Set "${set.name}" to "${update.name}"`
      : `Updated Curated Set "${set.name}"`;
  await logActivity(userId, {
    action: "curatedset.updated",
    entityType: "curatedset",
    entityId: curatedSetId,
    summary: changed,
  });
}

export async function deleteCuratedSet(userId: string, curatedSetId: string): Promise<void> {
  const set = await assertOwnsCuratedSet(userId, curatedSetId);
  await db.curatedSet.delete({ where: { id: curatedSetId } });
  await logActivity(userId, {
    action: "curatedset.deleted",
    entityType: "curatedset",
    entityId: curatedSetId,
    summary: `Deleted Curated Set "${set.name}"`,
  });
}
