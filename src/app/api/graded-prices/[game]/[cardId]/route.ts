import { NextRequest, NextResponse } from "next/server";
import { getOrFetchGradedPrices } from "@/lib/pricing/graded";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ game: string; cardId: string }> }
) {
  const { game, cardId } = await params;
  const catalogItemId = `${game}:${decodeURIComponent(cardId)}`;

  try {
    const result = await getOrFetchGradedPrices(catalogItemId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("PriceCharting lookup failed:", err);
    return NextResponse.json({ available: true, found: false }, { status: 200 });
  }
}
