import { NextRequest, NextResponse } from "next/server";
import { getDistinctVariants } from "@/lib/catalog/search";

export async function GET(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get("game") ?? undefined;
  const variantGroups = await getDistinctVariants(gameId);
  return NextResponse.json({ variantGroups });
}
