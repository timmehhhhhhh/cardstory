import { NextRequest, NextResponse } from "next/server";
import { getOrFetchGradedPrices } from "@/lib/pricing/graded";
import { getOrFetchSportsCardGradedPrices } from "@/lib/pricing/sports-graded";
import { getGameMeta } from "@/lib/games/registry";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ game: string; cardId: string }> }
) {
  const { game, cardId } = await params;

  // Public, side-effect-free — getOrFetchGradedPrices already caches the
  // underlying PriceCharting/SportsCardsPro lookup for the day, so an HTTP
  // cache of the same window is safe on top.
  const cacheHeaders = {
    "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
  };

  try {
    if (getGameMeta(game)?.kind === "sports") {
      const result = await getOrFetchSportsCardGradedPrices(decodeURIComponent(cardId));
      return NextResponse.json(result, { headers: cacheHeaders });
    }

    const catalogItemId = `${game}:${decodeURIComponent(cardId)}`;
    const result = await getOrFetchGradedPrices(catalogItemId);
    return NextResponse.json(result, { headers: cacheHeaders });
  } catch (err) {
    console.error("PriceCharting/SportsCardsPro lookup failed:", err);
    return NextResponse.json({ available: true, found: false }, { status: 200 });
  }
}
