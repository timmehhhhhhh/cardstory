import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { getGameMeta } from "@/lib/games/registry";
import { SetTile } from "@/app/sets/[game]/_components/set-tile";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ game: string }>;
}): Promise<Metadata> {
  const { game } = await params;
  return { title: getGameMeta(game)?.name ?? "Sets" };
}

export default async function GameSetsPage({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  const meta = getGameMeta(game);
  if (!meta || meta.status !== "WIRED") notFound();

  const sets = await db.set.findMany({
    where: { gameId: game },
    orderBy: { releaseDate: "desc" },
    include: { _count: { select: { items: true } } },
  });

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
            setId={s.id}
            name={s.name}
            code={s.code}
            cardCount={s._count.items}
            symbolUrl={s.symbolUrl}
            releaseDate={s.releaseDate ? s.releaseDate.toISOString().slice(0, 10) : null}
          />
        ))}
      </div>
    </div>
  );
}
