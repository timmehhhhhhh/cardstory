import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";
import { DEFAULT_VIEW_FILTERS, type SavedView, type ViewFilters } from "@/lib/views/types";

/**
 * Server-backed storage for the "Views" feature (saved catalog searches —
 * see src/app/views). Account-only, no local/guest counterpart (unlike PC),
 * so this is the single source of truth. Every function here takes the
 * requesting userId and re-checks row ownership itself (assertOwnsView)
 * rather than trusting that a valid session alone means the caller owns the
 * view id in question — ids are client-supplied. Every user-intentional
 * mutation also writes a best-effort entry to the account menu's History
 * feed (src/lib/activity/log.ts), same convention as src/lib/pc/manage.ts.
 */

function toSavedView(row: {
  id: string;
  name: string;
  filters: unknown;
  createdAt: Date;
  updatedAt: Date;
}): SavedView {
  return {
    id: row.id,
    name: row.name,
    // filters was validated by viewFiltersSchema (src/lib/views/api-schemas.ts)
    // before every write, so a plain merge-over-defaults is trusted here
    // rather than re-parsing on every read.
    filters: { ...DEFAULT_VIEW_FILTERS, ...(row.filters as Partial<ViewFilters>) },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** All of a user's saved Views, oldest-created first. */
export async function listViews(userId: string): Promise<SavedView[]> {
  const rows = await db.savedView.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toSavedView);
}

export async function createView(
  userId: string,
  id: string,
  name: string,
  filters: ViewFilters
): Promise<SavedView> {
  const row = await db.savedView.create({
    data: { id, userId, name, filters: filters as unknown as Prisma.InputJsonValue },
  });
  await logActivity(userId, {
    action: "view.created",
    entityType: "view",
    entityId: id,
    summary: `Created View "${name}"`,
  });
  return toSavedView(row);
}

async function assertOwnsView(userId: string, viewId: string): Promise<{ id: string; name: string }> {
  const view = await db.savedView.findUnique({
    where: { id: viewId },
    select: { id: true, userId: true, name: true },
  });
  if (!view || view.userId !== userId) {
    throw new Error("View not found");
  }
  return { id: view.id, name: view.name };
}

export async function renameView(userId: string, viewId: string, name: string): Promise<void> {
  const view = await assertOwnsView(userId, viewId);
  await db.savedView.update({ where: { id: viewId }, data: { name } });
  if (name !== view.name) {
    await logActivity(userId, {
      action: "view.renamed",
      entityType: "view",
      entityId: viewId,
      summary: `Renamed View "${view.name}" to "${name}"`,
    });
  }
}

export async function updateViewFilters(
  userId: string,
  viewId: string,
  filters: ViewFilters
): Promise<void> {
  const view = await assertOwnsView(userId, viewId);
  await db.savedView.update({
    where: { id: viewId },
    data: { filters: filters as unknown as Prisma.InputJsonValue },
  });
  await logActivity(userId, {
    action: "view.updated",
    entityType: "view",
    entityId: viewId,
    summary: `Updated filters for View "${view.name}"`,
  });
}

export async function deleteView(userId: string, viewId: string): Promise<void> {
  const view = await assertOwnsView(userId, viewId);
  await db.savedView.delete({ where: { id: viewId } });
  await logActivity(userId, {
    action: "view.deleted",
    entityType: "view",
    entityId: viewId,
    summary: `Deleted View "${view.name}"`,
  });
}
