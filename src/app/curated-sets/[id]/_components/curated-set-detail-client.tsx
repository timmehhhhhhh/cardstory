"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CardImage } from "@/components/cards/card-image";
import { CardTile } from "@/components/cards/card-tile";
import { usePCStore } from "@/lib/pc/store";
import { useCuratedSetsQuery, useCuratedSetsMutations } from "@/hooks/use-curated-sets";
import { computeCuratedSetProgress } from "@/lib/curated-sets/progress";
import type { CuratedSetFilters } from "@/lib/curated-sets/types";
import type { CatalogSearchItem } from "@/lib/catalog/search";
import { getGameMeta } from "@/lib/games/registry";
import { cardDetailHref } from "@/lib/catalog/card-href";
import { withEnglishName } from "@/lib/catalog/card-name";
import { CuratedSetBuilder } from "@/app/curated-sets/_components/curated-set-builder";

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-[width]"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

/** A still-missing card — grayscaled, non-interactive (no add-to-PC affordance), still links to the card detail page. */
function MissingCardTile({ item }: { item: CatalogSearchItem }) {
  const isSports = getGameMeta(item.gameId)?.kind === "sports";
  const href = cardDetailHref(item.gameId, item.id, isSports);
  const displayName = withEnglishName(
    item.variantLabel ? `${item.name} — ${item.variantLabel}` : item.name,
    item.nameEn
  );
  const inner = (
    <div className="relative aspect-[5/7] overflow-hidden rounded-xl border border-border bg-muted">
      <CardImage src={item.imageSmallUrl} alt={displayName} className="grayscale object-cover" />
    </div>
  );
  return (
    <div className="flex flex-col gap-1.5">
      {href ? <Link href={href}>{inner}</Link> : inner}
      <p className="truncate text-xs text-muted-foreground" title={displayName}>
        {displayName}
      </p>
    </div>
  );
}

export function CuratedSetDetailClient({ curatedSetId }: { curatedSetId: string }) {
  const router = useRouter();
  const { status } = useSession();
  const { data: curatedSets = [], isLoading: setsLoading } = useCuratedSetsQuery({
    enabled: status === "authenticated",
  });
  const { updateCuratedSet, deleteCuratedSet } = useCuratedSetsMutations();
  const pcs = usePCStore((s) => s.pcs);
  const [builderOpen, setBuilderOpen] = React.useState(false);

  const curatedSet = curatedSets.find((s) => s.id === curatedSetId);

  const matchesQuery = useQuery<{ items: CatalogSearchItem[]; truncated: boolean }>({
    queryKey: ["curated-set-matches", curatedSetId],
    queryFn: async () => {
      const res = await fetch(`/api/curated-sets/${curatedSetId}/matches`);
      if (!res.ok) throw new Error("Failed to load matches");
      return res.json();
    },
    enabled: !!curatedSet,
    staleTime: 30_000,
  });

  if (status === "loading" || setsLoading) return null;

  if (!curatedSet) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-16 text-center">
        <p className="font-medium">Curated set not found</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/curated-sets">
            <ArrowLeft className="size-3.5" /> Back to Curated Sets
          </Link>
        </Button>
      </div>
    );
  }

  const matches = matchesQuery.data?.items ?? [];
  const truncated = matchesQuery.data?.truncated ?? false;
  const progress = computeCuratedSetProgress(matches, pcs, curatedSet.targetQuantity);

  function handleBuilderSubmit(name: string, filters: CuratedSetFilters, targetQuantity: number) {
    updateCuratedSet(curatedSetId, { name, filters, targetQuantity });
    setBuilderOpen(false);
  }

  function handleDelete() {
    deleteCuratedSet(curatedSetId);
    router.push("/curated-sets");
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="w-fit -ml-2">
          <Link href="/curated-sets">
            <ArrowLeft className="size-3.5" /> Curated Sets
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{curatedSet.name}</h1>
            {curatedSet.targetQuantity > 1 && (
              <p className="mt-0.5 text-sm text-muted-foreground">{curatedSet.targetQuantity}x playset</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setBuilderOpen(true)}>
              <Pencil className="size-3.5" /> Edit filters
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete}>
              <Trash2 className="size-3.5" /> Delete
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <ProgressBar pct={matchesQuery.isLoading ? 0 : progress.pct} />
          <p className="text-sm text-muted-foreground">
            {matchesQuery.isLoading
              ? "Loading…"
              : `Set Progress: ${progress.completed.toLocaleString()} / ${progress.total.toLocaleString()} (${progress.pct}%)`}
          </p>
          {truncated && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              This set is very broad — results are capped. Add more filters for an accurate count.
            </p>
          )}
        </div>
      </div>

      {matchesQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[5/7] rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Owned · {progress.owned.length.toLocaleString()}
            </h2>
            {progress.owned.length === 0 ? (
              <p className="text-sm text-muted-foreground">None of these cards are in your PC yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {progress.owned.map((item) => (
                  <CardTile key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Missing · {progress.missing.length.toLocaleString()}
            </h2>
            {progress.missing.length === 0 ? (
              <p className="text-sm text-muted-foreground">Complete! You own every card in this set.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {progress.missing.map((item) => (
                  <MissingCardTile key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <CuratedSetBuilder
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        initialName={curatedSet.name}
        initialFilters={curatedSet.filters}
        initialTargetQuantity={curatedSet.targetQuantity}
        onSubmit={handleBuilderSubmit}
      />
    </div>
  );
}
