import { NextRequest, NextResponse } from "next/server";
import { getDistinctRarities } from "@/lib/catalog/search";

export async function GET(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get("game") ?? undefined;
  const rarities = await getDistinctRarities(gameId);
  return NextResponse.json(
    { rarities },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
  );
}
