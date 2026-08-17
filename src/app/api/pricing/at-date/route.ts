import { NextRequest, NextResponse } from "next/server";
import { getPriceAtDate } from "@/lib/pricing/history";
import { getSportsCardPriceAtDate } from "@/lib/pricing/sports-history";

/**
 * "What was this item's market price on (or nearest before) this date?" —
 * used by the Add-to-PC dialogs to resolve Holding.priceAtAcquisition when
 * a card is backdated rather than added "today" (in which case the caller
 * already has the live price in hand and skips this call entirely). Keyed
 * directly by catalogItemId/sportsCardItemId — not game/cardId path params
 * like /api/price-history — since that's what those dialogs actually have.
 * Public, no auth: same read-only reasoning as /api/price-history.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const catalogItemId = sp.get("catalogItemId");
  const sportsCardItemId = sp.get("sportsCardItemId");
  const date = sp.get("date");

  if (!date || (!catalogItemId && !sportsCardItemId)) {
    return NextResponse.json(
      { error: "Requires `date` and one of `catalogItemId`/`sportsCardItemId`" },
      { status: 400 }
    );
  }

  const priceRaw = sportsCardItemId
    ? await getSportsCardPriceAtDate(sportsCardItemId, date)
    : await getPriceAtDate(catalogItemId!, date);

  return NextResponse.json({ priceRaw });
}
