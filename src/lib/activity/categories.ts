/**
 * Filter-tab taxonomy for the account menu's History page — kept separate
 * from log.ts (which imports the server-only Prisma client) so client
 * components can import this without pulling `db` into the browser bundle.
 */
export const ACTIVITY_CATEGORIES = ["all", "search", "added", "deleted", "updated", "vendor"] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
  all: "All",
  search: "Search",
  added: "Added",
  deleted: "Deleted",
  updated: "Updated",
  vendor: "Vendor",
};

const CATEGORY_ACTIONS: Record<Exclude<ActivityCategory, "all">, string[]> = {
  search: ["search.performed"],
  added: [
    "holding.added",
    "holding.imported",
    "holding.transferred",
    "pc.created",
    "showcase.published",
    "view.created",
  ],
  deleted: ["holding.deleted", "pc.deleted", "showcase.deleted", "view.deleted"],
  updated: ["holding.updated", "pc.renamed", "view.renamed", "view.updated"],
  vendor: ["vendor.enabled", "vendor.disabled"],
};

/** Stored `action` keys (for Prisma `action: { in: [...] }`) for a category, or undefined for "all". */
export function actionsForCategory(category: ActivityCategory): string[] | undefined {
  if (category === "all") return undefined;
  return CATEGORY_ACTIONS[category];
}
