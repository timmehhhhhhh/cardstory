import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";
import { CATALOG_SORTS, searchCatalog, type CatalogSort } from "@/lib/catalog/search";

const SEARCH_LOG_DEDUPE_MS = 2 * 60 * 1000;

/**
 * Comma-splits a query param into a string array, e.g. "EN,JP" -> ["EN",
 * "JP"]. Used both for the id-list params (onlyIds/excludeIds) and, since
 * searchCatalog's cardType/rarity/language/artist params now accept
 * scalar-or-array (see src/lib/catalog/search.ts), for multi-value filter
 * params too — Explore's own single-select sidebar keeps sending
 * comma-free single values, which round-trip through here unchanged as a
 * one-element array, so this is purely additive/backward-compatible.
 */
function parseMulti(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const parts = value.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const sortParam = sp.get("sort") ?? "best_match";
  const sort: CatalogSort = (CATALOG_SORTS as readonly string[]).includes(sortParam)
    ? (sortParam as CatalogSort)
    : "best_match";

  const productTypeParam = sp.get("type");
  const productType =
    productTypeParam === "CARD" || productTypeParam === "SEALED" ? productTypeParam : undefined;

  const q = sp.get("q") ?? undefined;

  const result = await searchCatalog({
    q,
    gameId: sp.get("game") ?? undefined,
    setId: sp.get("set") ?? undefined,
    productType,
    cardType: parseMulti(sp.get("cardType")),
    rarity: parseMulti(sp.get("rarity")),
    language: parseMulti(sp.get("language")),
    variant: parseMulti(sp.get("variant")),
    artist: parseMulti(sp.get("artist")),
    baseOnly: sp.get("baseOnly") === "1",
    onlyIds: parseMulti(sp.get("onlyIds")),
    excludeIds: parseMulti(sp.get("excludeIds")),
    sort,
    page: sp.get("page") ? Number(sp.get("page")) : undefined,
    pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : undefined,
  });

  // Only log deliberate text searches, not every filter/pagination
  // re-fetch (Explore re-queries on any filter or page change) — and only
  // for signed-in users, since search itself works for guests too.
  const trimmedQuery = q?.trim();
  if (trimmedQuery) {
    const session = await auth();
    if (session?.user) {
      const summary = `Searched for "${trimmedQuery}"`;
      const recent = await db.activityLog.findFirst({
        where: { userId: session.user.id, action: "search.performed", summary },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      const isRecentDuplicate =
        recent && Date.now() - recent.createdAt.getTime() < SEARCH_LOG_DEDUPE_MS;
      if (!isRecentDuplicate) {
        await logActivity(session.user.id, {
          action: "search.performed",
          entityType: "search",
          summary,
          metadata: { q: trimmedQuery, game: sp.get("game") ?? undefined },
        });
      }
    }
  }

  return NextResponse.json(result);
}
