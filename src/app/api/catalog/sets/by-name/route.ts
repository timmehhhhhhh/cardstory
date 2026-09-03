import { NextRequest, NextResponse } from "next/server";
import { findSetsByName } from "@/lib/catalog/search";

/**
 * Resolves a typed set name (e.g. from the global search bar) to the
 * matching Set(s) across every game, so the search bar can route straight
 * to that set's cards on Explore instead of falling through to the generic
 * free-text card search — see findSetsByName for why that fallback alone
 * doesn't work for TCG sets.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ matches: [] });
  const matches = await findSetsByName(q);
  return NextResponse.json({ matches });
}
