import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";
import { CATALOG_SORTS, searchCatalog, type CatalogSort } from "@/lib/catalog/search";

const SEARCH_LOG_DEDUPE_MS = 2 * 60 * 1000;

function parseIds(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const ids = value.split(",").map((s) => s.trim()).filter(Boolean);
  return ids.length > 0 ? ids : undefined;
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
    cardType: sp.get("cardType") ?? undefined,
    rarity: sp.get("rarity") ?? undefined,
    language: sp.get("language") ?? undefined,
    baseOnly: sp.get("baseOnly") === "1",
    onlyIds: parseIds(sp.get("onlyIds")),
    excludeIds: parseIds(sp.get("excludeIds")),
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
