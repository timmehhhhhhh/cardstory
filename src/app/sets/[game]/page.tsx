import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Sport } from "@prisma/client";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { getGameMeta } from "@/lib/games/registry";
import { SetTile } from "@/app/sets/[game]/_components/set-tile";
import { formatReleaseDate } from "@/lib/format/date";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ game: string }>;
}): Promise<Metadata> {
  const { game } = await params;
  return { title: getGameMeta(game)?.name ?? "Sets" };
}

interface SetTileData {
  id: string;
  setId: string;
  name: string;
  code: string | null;
  cardCount: number;
  symbolUrl: string | null;
  releaseDate: string | null;
}

async function loadTcgSets(game: string): Promise<SetTileData[]> {
  const sets = await db.set.findMany({
    where: { gameId: game },
    orderBy: { releaseDate: "desc" },
    include: { _count: { select: { items: true } } },
  });
  return sets.map((s) => ({
    id: s.id,
    setId: s.id,
    name: s.name,
    code: s.code,
    cardCount: s._count.items,
    symbolUrl: s.symbolUrl,
    releaseDate: formatReleaseDate(s.releaseDate),
  }));
}

/**
 * Sports-kind games have no Set table row to query — SportsCardItem groups
 * by (year, distributor, setName) instead, and the group's synthesized
 * "<year>::<distributor>::<setName>" setId round-trips through
 * lib/catalog/search.ts's sports where-clause decoding. See SetTile's
 * `code`/`releaseDate` null-handling for how the missing set-code/date
 * concepts are papered over.
 */
async function loadSportsSets(sport: Sport | undefined): Promise<SetTileData[]> {
  const groups = await db.sportsCardItem.groupBy({
    by: ["year", "distributor", "setName"],
    where: { sport },
    _count: { _all: true },
    _min: { releaseDate: true },
    orderBy: [{ year: "desc" }],
  });
  return groups.map((g) => {
    const setId = `${g.year ?? ""}::${g.distributor ?? ""}::${g.setName}`;
    const name = [g.year, g.distributor, g.setName].filter(Boolean).join(" ").trim();
    return {
      id: setId,
      setId,
      name,
      code: null,
      cardCount: g._count._all,
      symbolUrl: null,
      // Prefer the real researched release date; fall back to the bare year
      // for any product line whose date research came up empty (see
      // scripts/data/lamelo-ball/release-dates.ts).
      releaseDate: formatReleaseDate(g._min.releaseDate) ?? (g.year ? String(g.year) : null),
    };
  });
}

export default async function GameSetsPage({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  const meta = getGameMeta(game);
  if (!meta || meta.status !== "WIRED") notFound();

  const sets = meta.kind === "sports" ? await loadSportsSets(meta.sport) : await loadTcgSets(game);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Link
        href="/sets"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All games
      </Link>
      <h1 className="mb-1 text-lg font-semibold">{meta.name}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {sets.length} set{sets.length === 1 ? "" : "s"} currently in the catalog.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sets.map((s) => (
          <SetTile
            key={s.id}
            gameId={game}
            setId={s.setId}
            name={s.name}
            code={s.code}
            cardCount={s.cardCount}
            symbolUrl={s.symbolUrl}
            releaseDate={s.releaseDate}
          />
        ))}
      </div>
    </div>
  );
}
