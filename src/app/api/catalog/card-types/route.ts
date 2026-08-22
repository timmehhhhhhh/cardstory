import { NextRequest, NextResponse } from "next/server";
import { getDistinctCardTypes } from "@/lib/catalog/search";

export async function GET(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get("game") ?? undefined;
  const cardTypeGroups = await getDistinctCardTypes(gameId);
  return NextResponse.json(
    { cardTypeGroups },
    // Public, side-effect-free catalog facets — changes only on
    // reseed/re-crawl, far less often than this. See getDistinctCardTypes'
    // matching unstable_cache TTL in lib/catalog/search.ts.
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
  );
}
