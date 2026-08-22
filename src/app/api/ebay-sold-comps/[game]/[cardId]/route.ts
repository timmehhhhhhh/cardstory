import { NextRequest, NextResponse } from "next/server";
import { getOrFetchEbaySoldComps } from "@/lib/pricing/ebay/ebay-comps";
import { getOrFetchSportsCardEbaySoldComps } from "@/lib/pricing/ebay/sports-ebay-comps";
import { getGameMeta } from "@/lib/games/registry";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ game: string; cardId: string }> }
) {
  const { game, cardId } = await params;

  // Public, side-effect-free — getOrFetchEbaySoldComps already caches the
  // underlying scrape for the day, so an HTTP cache of the same window is
  // safe on top.
  const cacheHeaders = {
    "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
  };

  try {
    if (getGameMeta(game)?.kind === "sports") {
      const result = await getOrFetchSportsCardEbaySoldComps(decodeURIComponent(cardId));
      return NextResponse.json(result, { headers: cacheHeaders });
    }

    const catalogItemId = `${game}:${decodeURIComponent(cardId)}`;
    const result = await getOrFetchEbaySoldComps(catalogItemId);
    return NextResponse.json(result, { headers: cacheHeaders });
  } catch (err) {
    console.error("eBay sold-comps lookup failed:", err);
    return NextResponse.json({ available: true, found: false }, { status: 200 });
  }
}
