import { NextRequest, NextResponse } from "next/server";
import { getOrFetchGradedPrices } from "@/lib/pricing/graded";
import { getOrFetchSportsCardGradedPrices } from "@/lib/pricing/sports-graded";
import { getGameMeta } from "@/lib/games/registry";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ game: string; cardId: string }> }
) {
  const { game, cardId } = await params;

  try {
    if (getGameMeta(game)?.kind === "sports") {
      const result = await getOrFetchSportsCardGradedPrices(decodeURIComponent(cardId));
      return NextResponse.json(result);
    }

    const catalogItemId = `${game}:${decodeURIComponent(cardId)}`;
    const result = await getOrFetchGradedPrices(catalogItemId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("PriceCharting/SportsCardsPro lookup failed:", err);
    return NextResponse.json({ available: true, found: false }, { status: 200 });
  }
}
