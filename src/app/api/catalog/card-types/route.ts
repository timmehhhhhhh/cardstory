import { NextRequest, NextResponse } from "next/server";
import { getDistinctCardTypes } from "@/lib/catalog/search";

export async function GET(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get("game") ?? undefined;
  const cardTypeGroups = await getDistinctCardTypes(gameId);
  return NextResponse.json({ cardTypeGroups });
}
