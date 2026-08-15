import { NextRequest, NextResponse } from "next/server";
import { getPriceHistory } from "@/lib/pricing/history";
import { getSportsCardPriceHistory } from "@/lib/pricing/sports-history";
import { getGameMeta } from "@/lib/games/registry";
import { PRICE_HISTORY_RANGES, type PriceHistoryRange } from "@/lib/constants";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ game: string; cardId: string }> }
) {
  const { game, cardId } = await params;
  const rangeParam = req.nextUrl.searchParams.get("range") ?? "3M";
  const range: PriceHistoryRange = (PRICE_HISTORY_RANGES as readonly string[]).includes(rangeParam)
    ? (rangeParam as PriceHistoryRange)
    : "3M";

  if (getGameMeta(game)?.kind === "sports") {
    const points = await getSportsCardPriceHistory(decodeURIComponent(cardId), range);
    return NextResponse.json({ range, points });
  }

  const catalogItemId = `${game}:${decodeURIComponent(cardId)}`;
  const points = await getPriceHistory(catalogItemId, range);
  return NextResponse.json({ range, points });
}
