import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGameMeta } from "@/lib/games/registry";

/**
 * Sets for one or more TCG games, grouped by game — powers the Curated Set
 * builder's "sets" multi-select (src/app/curated-sets/_components/
 * curated-set-builder.tsx). Sports games have no Set table/concept (see
 * decodeSportsSetId in src/lib/catalog/search.ts) so they're simply omitted
 * from the response rather than erroring.
 */
export interface SetOption {
  gameId: string;
  gameName: string;
  sets: { id: string; name: string }[];
}

export async function GET(req: NextRequest) {
  const gameIds = (req.nextUrl.searchParams.get("games") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((id) => getGameMeta(id)?.kind !== "sports");

  if (gameIds.length === 0) {
    return NextResponse.json(
      { setOptions: [] },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
    );
  }

  const rows = await db.set.findMany({
    where: { gameId: { in: gameIds } },
    select: { id: true, gameId: true, name: true },
    orderBy: { name: "asc" },
  });

  const byGame = new Map<string, { id: string; name: string }[]>();
  for (const row of rows) {
    const list = byGame.get(row.gameId);
    if (list) list.push({ id: row.id, name: row.name });
    else byGame.set(row.gameId, [{ id: row.id, name: row.name }]);
  }

  const setOptions: SetOption[] = gameIds
    .filter((id) => byGame.has(id))
    .map((id) => ({ gameId: id, gameName: getGameMeta(id)?.name ?? id, sets: byGame.get(id)! }));

  return NextResponse.json(
    { setOptions },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
  );
}
