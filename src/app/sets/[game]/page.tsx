import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import type { Sport } from "@prisma/client";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { getGameMeta } from "@/lib/games/registry";
import { SetTile } from "@/app/sets/[game]/_components/set-tile";
import { SortControls, type SetSortField } from "@/app/sets/[game]/_components/sort-controls";
import { formatReleaseMonthYear } from "@/lib/format/date";
import { languageFromSetCode, languageLabel } from "@/lib/format/language";
import { requireSession } from "@/lib/auth/require-session";

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
  nameEn: string | null;
  code: string | null;
  cardCount: number;
  symbolUrl: string | null;
  logoUrl: string | null;
  releaseDate: string | null;
  language: string;
}

const loadTcgSets = unstable_cache(
  async (game: string, direction: "asc" | "desc", sortBy: SetSortField): Promise<SetTileData[]> => {
    const sets = await db.set.findMany({
      where: { gameId: game },
      // Explicit nulls: "last" in both directions — Postgres's own default
      // (nulls sort as largest) already gives this for desc, but being
      // explicit keeps undated sets out of the way regardless of direction.
      orderBy:
        sortBy === "name"
          ? { name: direction }
          : { releaseDate: { sort: direction, nulls: "last" } },
      include: { _count: { select: { items: true } } },
    });
    return sets.map((s) => ({
      id: s.id,
      setId: s.id,
      name: s.name,
      nameEn: s.nameEn,
      code: s.code,
      cardCount: s._count.items,
      symbolUrl: s.symbolUrl,
      logoUrl: s.logoUrl,
      releaseDate: formatReleaseMonthYear(s.releaseDate),
      // Only Pokémon has non-English sets, encoded as a "<lang>:" prefix on
      // `code` — see languageFromSetCode.
      language: languageFromSetCode(s.code),
    }));
  },
  ["catalog-tcg-sets"],
  // Set lists only change on reseed/re-crawl, far less often than the
  // once-daily price cron — see getDistinct* in lib/catalog/search.ts.
  { tags: ["catalog-sets"], revalidate: 86400 }
);

/**
 * Sports-kind games have no Set table row to query — SportsCardItem groups
 * by (year, distributor, setName) instead, and the group's synthesized
 * "<year>::<distributor>::<setName>" setId round-trips through
 * lib/catalog/search.ts's sports where-clause decoding. See SetTile's
 * `code`/`releaseDate` null-handling for how the missing set-code/date
 * concepts are papered over.
 */
const loadSportsSets = unstable_cache(
  async (
    sport: Sport | undefined,
    direction: "asc" | "desc",
    sortBy: SetSortField
  ): Promise<SetTileData[]> => {
    const groups = await db.sportsCardItem.groupBy({
      by: ["year", "distributor", "setName"],
      where: { sport },
      _count: { _all: true },
      _min: { releaseDate: true },
      // Sports has no per-set Set.releaseDate row to sort by — year is
      // already its primary sort key for "date"; "name" sorts on setName
      // instead (the only free-text field — see the SportsCardItem model
      // comment for why year/distributor/setName stay split).
      orderBy: [sortBy === "name" ? { setName: direction } : { year: direction }],
    });
    return groups.map((g) => {
      const setId = `${g.year ?? ""}::${g.distributor ?? ""}::${g.setName}`;
      const name = [g.year, g.distributor, g.setName].filter(Boolean).join(" ").trim();
      return {
        id: setId,
        setId,
        name,
        nameEn: null,
        code: null,
        cardCount: g._count._all,
        symbolUrl: null,
        logoUrl: null,
        // Prefer the real researched release date; fall back to the bare year
        // for any product line whose date research came up empty (see
        // scripts/data/lamelo-ball/release-dates.ts).
        releaseDate:
          formatReleaseMonthYear(g._min.releaseDate) ?? (g.year ? String(g.year) : null),
        // SportsCardItem has no language field — sports memorabilia is
        // English-only, so grouping by language always yields one bucket.
        language: "EN",
      };
    });
  },
  ["catalog-sports-sets"],
  { tags: ["catalog-sets"], revalidate: 86400 }
);

/** English first, then the rest alphabetically by display label — mirrors LANGUAGE_OPTIONS' ordering in app/views/_components/view-builder.tsx. */
function compareLanguage(a: string, b: string): number {
  if (a === b) return 0;
  if (a === "EN") return -1;
  if (b === "EN") return 1;
  return languageLabel(a).localeCompare(languageLabel(b));
}

export default async function GameSetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ game: string }>;
  searchParams: Promise<{ sort?: string; sortBy?: string; group?: string }>;
}) {
  await requireSession();
  const { game } = await params;
  const { sort, sortBy: sortByParam, group } = await searchParams;
  const meta = getGameMeta(game);
  if (!meta || meta.status !== "WIRED") notFound();

  const direction: "asc" | "desc" = sort === "asc" ? "asc" : "desc";
  const sortBy: SetSortField = sortByParam === "name" ? "name" : "date";
  const grouped = group === "language";
  const sets =
    meta.kind === "sports"
      ? await loadSportsSets(meta.sport, direction, sortBy)
      : await loadTcgSets(game, direction, sortBy);

  // Group by language while preserving the already-sorted (date/name) order
  // within each group — Map insertion order follows first-seen language, so
  // re-sort just the group keys themselves (English first, see
  // compareLanguage) rather than the sets inside them.
  const groups: { language: string; sets: SetTileData[] }[] = grouped
    ? Array.from(
        sets.reduce((byLanguage, s) => {
          const bucket = byLanguage.get(s.language);
          if (bucket) bucket.push(s);
          else byLanguage.set(s.language, [s]);
          return byLanguage;
        }, new Map<string, SetTileData[]>()),
        ([language, groupSets]) => ({ language, sets: groupSets })
      ).sort((a, b) => compareLanguage(a.language, b.language))
    : [{ language: "", sets }];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Link
        href="/sets"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All games
      </Link>
      <h1 className="mb-1 text-lg font-semibold">{meta.name}</h1>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {sets.length} set{sets.length === 1 ? "" : "s"} currently in the catalog.
        </p>
        <SortControls />
      </div>

      <div className="space-y-6">
        {groups.map((g) => (
          <div key={g.language || "all"}>
            {grouped && (
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
                {languageLabel(g.language)}{" "}
                <span className="font-normal">
                  ({g.sets.length} set{g.sets.length === 1 ? "" : "s"})
                </span>
              </h2>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {g.sets.map((s) => (
                <SetTile
                  key={s.id}
                  gameId={game}
                  setId={s.setId}
                  name={s.name}
                  nameEn={s.nameEn}
                  code={s.code}
                  cardCount={s.cardCount}
                  symbolUrl={s.symbolUrl}
                  logoUrl={s.logoUrl}
                  releaseDate={s.releaseDate}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
