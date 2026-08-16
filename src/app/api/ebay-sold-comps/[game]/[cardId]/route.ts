import { NextRequest, NextResponse } from "next/server";
import { getOrFetchEbaySoldComps } from "@/lib/pricing/ebay/ebay-comps";
import { getOrFetchSportsCardEbaySoldComps } from "@/lib/pricing/ebay/sports-ebay-comps";
import { getGameMeta } from "@/lib/games/registry";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ game: string; cardId: string }> }
) {
  const { game, cardId } = await params;

  try {
    if (getGameMeta(game)?.kind === "sports") {
      const result = await getOrFetchSportsCardEbaySoldComps(decodeURIComponent(cardId));
      return NextResponse.json(result);
    }

    const catalogItemId = `${game}:${decodeURIComponent(cardId)}`;
    const result = await getOrFetchEbaySoldComps(catalogItemId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("eBay sold-comps lookup failed:", err);
    return NextResponse.json({ available: true, found: false }, { status: 200 });
  }
}
