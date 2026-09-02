import type { Binder, BinderPocketRef, BinderStatus, BinderStoreDataV3, PageBackground } from "@/lib/binder/types";

/**
 * Normalizes whatever shape is sitting under the old "cardstory:binder:v1"
 * localStorage key into today's BinderStoreDataV3 — the same v1→v2→v3
 * migration the old zustand `persist` store used to run automatically on
 * hydration (see the removed `migrate` option in the pre-server-sync
 * src/lib/binder/store.ts). Now that the store is server-backed and reads
 * this key only once, from src/components/auth/binder-import-prompt.tsx,
 * this raw read bypasses that automatic migration — so the same version
 * handling has to happen here instead, same reasoning as
 * src/components/auth/pc-import-prompt.tsx's normalizeWatchlist.
 *
 * v1 pockets were bare `holdingId | null`; v2 wraps them in a
 * discriminated ref so a pocket can also point at a bare catalog item the
 * user doesn't own yet. v3 adds pageBackground (renamed from
 * pocketBackground) and the "custom"/"custom-covered" ref kinds — purely
 * additive, so existing holding/catalog refs pass through unchanged.
 */
export function normalizeLocalBinderData(raw: unknown): BinderStoreDataV3 | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const schemaVersion = typeof p.schemaVersion === "number" ? p.schemaVersion : 1;

  if (!Array.isArray(p.binders)) return null;

  const binders: Binder[] = (p.binders as Record<string, unknown>[]).map((b) => ({
    id: String(b.id ?? ""),
    name: String(b.name ?? "My Binder"),
    layoutId: (b.layoutId as Binder["layoutId"]) ?? "9",
    coverColor: (b.coverColor as Binder["coverColor"]) ?? "black",
    pageBackground:
      (b.pageBackground as PageBackground | undefined) ?? (b.pocketBackground as PageBackground | undefined) ?? "match-cover",
    status: (b.status as BinderStatus | undefined) ?? "wip",
    pages: Array.isArray(b.pages)
      ? (b.pages as Record<string, unknown>[]).map((page) => ({
          id: String(page.id ?? ""),
          pockets: Array.isArray(page.pockets)
            ? (page.pockets as unknown[]).map((slot) =>
                schemaVersion >= 2
                  ? (slot as BinderPocketRef | null)
                  : typeof slot === "string"
                    ? ({ kind: "holding", holdingId: slot } satisfies BinderPocketRef)
                    : null
              )
            : [],
        }))
      : [],
    createdAt: typeof b.createdAt === "string" ? b.createdAt : new Date().toISOString(),
    updatedAt: typeof b.updatedAt === "string" ? b.updatedAt : new Date().toISOString(),
  }));

  if (binders.length === 0) return null;

  return {
    schemaVersion: 3,
    activeBinderId: (p.activeBinderId as string | undefined) ?? binders[0].id,
    binders,
    showNumberTags: (p.showNumberTags as boolean | undefined) ?? true,
    showNotOwnedTags: (p.showNotOwnedTags as boolean | undefined) ?? true,
  };
}
