import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Sport } from "@prisma/client";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { getGameMeta } from "@/lib/games/registry";
import { SetTile } from "@/app/sets/[game]/_components/set-tile";
import { SortToggle } from "@/app/sets/[game]/_components/sort-toggle";
import { formatReleaseMonthYear } from "@/lib/format/date";

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
  logoUrl: string | null;
  releaseDate: string | null;
}

async function loadTcgSets(game: string, direction: "asc" | "desc"): Promise<SetTileData[]> {
  const sets = await db.set.findMany({
    where: { gameId: game },
    // Explicit nulls: "last" in both directions — Postgres's own default
    // (nulls sort as largest) already gives this for desc, but being
    // explicit keeps undated sets out of the way regardless of direction.
    orderBy: { releaseDate: { sort: direction, nulls: "last" } },
    include: { _count: { select: { items: true } } },
  });
  return sets.map((s) => ({
    id: s.id,
    setId: s.id,
    name: s.name,
    code: s.code,
    cardCount: s._count.items,
    symbolUrl: s.symbolUrl,
    logoUrl: s.logoUrl,
    releaseDate: formatReleaseMonthYear(s.releaseDate),
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
async function loadSportsSets(
  sport: Sport | undefined,
  direction: "asc" | "desc"
): Promise<SetTileData[]> {
  const groups = await db.sportsCardItem.groupBy({
    by: ["year", "distributor", "setName"],
    where: { sport },
    _count: { _all: true },
    _min: { releaseDate: true },
    // Sports has no per-set Set.releaseDate row to sort by — year is
    // already its primary sort key, so the toggle just flips its direction.
    orderBy: [{ year: direction }],
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
      logoUrl: null,
      // Prefer the real researched release date; fall back to the bare year
      // for any product line whose date research came up empty (see
      // scripts/data/lamelo-ball/release-dates.ts).
      releaseDate: formatReleaseMonthYear(g._min.releaseDate) ?? (g.year ? String(g.year) : null),
    };
  });
}

export default async function GameSetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ game: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { game } = await params;
  const { sort } = await searchParams;
  const meta = getGameMeta(game);
  if (!meta || meta.status !== "WIRED") notFound();

  const direction: "asc" | "desc" = sort === "asc" ? "asc" : "desc";
  const sets =
    meta.kind === "sports"
      ? await loadSportsSets(meta.sport, direction)
      : await loadTcgSets(game, direction);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Link
        href="/sets"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All games
      </Link>
      <h1 className="mb-1 text-lg font-semibold">{meta.name}</h1>
      <div className="mb-6 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {sets.length} set{sets.length === 1 ? "" : "s"} currently in the catalog.
        </p>
        <SortToggle />
      </div>

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
            logoUrl={s.logoUrl}
            releaseDate={s.releaseDate}
          />
        ))}
      </div>
    </div>
  );
}
