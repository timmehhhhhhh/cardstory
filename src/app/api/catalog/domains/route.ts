import { NextRequest, NextResponse } from "next/server";
import { getDistinctDomains } from "@/lib/catalog/search";

export async function GET(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get("game") ?? undefined;
  const domains = await getDistinctDomains(gameId);
  return NextResponse.json(
    { domains },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
  );
}
