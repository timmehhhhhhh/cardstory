import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGameMeta } from "@/lib/games/registry";

export interface QuickImportSetOption {
  id: string;
  name: string;
  nameEn?: string | null;
}

/**
 * Sets for exactly one game, TCG or sports — powers Quick Import's
 * client-side fuzzy set-name matching (see src/lib/quick-import/match-set.ts
 * and src/app/quick-import/_components/quick-import-client.tsx). Unlike
 * /api/catalog/sets (which only covers Set-table TCGs, scoped to the
 * Curated Set builder's multi-game needs), this also covers sports games by
 * synthesizing set ids from SportsCardItem's (year, distributor, setName)
 * grouping — same convention as loadSportsSets in
 * src/app/sets/[game]/page.tsx, decoded back the same way by
 * decodeSportsSetId in src/lib/catalog/search.ts, so the ids returned here
 * round-trip through /api/catalog/search's `set` param unchanged.
 */
export async function GET(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get("gameId") ?? "";
  const meta = getGameMeta(gameId);
  const headers = { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" };

  if (!meta) {
    return NextResponse.json({ sets: [] }, { headers });
  }

  if (meta.kind === "sports") {
    const groups = await db.sportsCardItem.groupBy({
      by: ["year", "distributor", "setName"],
      where: { sport: meta.sport },
    });
    const sets: QuickImportSetOption[] = groups.map((g) => ({
      id: `${g.year ?? ""}::${g.distributor ?? ""}::${g.setName}`,
      name: [g.year, g.distributor, g.setName].filter(Boolean).join(" ").trim(),
    }));
    return NextResponse.json({ sets }, { headers });
  }

  const rows = await db.set.findMany({
    where: { gameId },
    select: { id: true, name: true, nameEn: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ sets: rows satisfies QuickImportSetOption[] }, { headers });
}
