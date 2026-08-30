"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCuratedSetsQuery, useCuratedSetsMutations } from "@/hooks/use-curated-sets";
import { usePCStore } from "@/lib/pc/store";
import { computeCuratedSetProgress } from "@/lib/curated-sets/progress";
import type { CuratedSet, CuratedSetFilters } from "@/lib/curated-sets/types";
import type { CatalogSearchItem } from "@/lib/catalog/search";
import { CuratedSetBuilder } from "@/app/curated-sets/_components/curated-set-builder";

function EmptyState({ title, description }: { title: string; description: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-16 text-center">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-[width]"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

function CuratedSetCard({
  curatedSet,
  onEdit,
  onDelete,
}: {
  curatedSet: CuratedSet;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pcs = usePCStore((s) => s.pcs);
  const matchesQuery = useQuery<{ items: CatalogSearchItem[]; truncated: boolean }>({
    queryKey: ["curated-set-matches", curatedSet.id],
    queryFn: async () => {
      const res = await fetch(`/api/curated-sets/${curatedSet.id}/matches`);
      if (!res.ok) throw new Error("Failed to load matches");
      return res.json();
    },
    staleTime: 30_000,
  });

  const matches = matchesQuery.data?.items ?? [];
  const progress = computeCuratedSetProgress(matches, pcs, curatedSet.targetQuantity);
  const isLoading = matchesQuery.isLoading;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 hover:bg-surface-elevated/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/curated-sets/${curatedSet.id}`} className="min-w-0 flex-1">
          <p className="truncate font-medium">{curatedSet.name}</p>
          {curatedSet.targetQuantity > 1 && (
            <p className="mt-0.5 text-xs text-muted-foreground">{curatedSet.targetQuantity}x playset</p>
          )}
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label={`Actions for ${curatedSet.name}`}>
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="size-4" /> Edit filters
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} variant="destructive">
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Link href={`/curated-sets/${curatedSet.id}`} className="flex flex-col gap-1.5">
        <ProgressBar pct={isLoading ? 0 : progress.pct} />
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "Loading…"
            : `Set Progress: ${progress.completed.toLocaleString()} / ${progress.total.toLocaleString()} (${progress.pct}%)`}
        </p>
      </Link>
    </div>
  );
}

export function CuratedSetsClient() {
  const { data: session, status } = useSession();
  const { data: curatedSets = [], isLoading } = useCuratedSetsQuery({ enabled: status === "authenticated" });
  const { createCuratedSet, updateCuratedSet, deleteCuratedSet } = useCuratedSetsMutations();

  const [builderOpen, setBuilderOpen] = React.useState(false);
  const [editingSet, setEditingSet] = React.useState<CuratedSet | null>(null);

  function openCreate() {
    setEditingSet(null);
    setBuilderOpen(true);
  }

  function openEdit(set: CuratedSet) {
    setEditingSet(set);
    setBuilderOpen(true);
  }

  function handleBuilderSubmit(name: string, filters: CuratedSetFilters, targetQuantity: number) {
    if (editingSet) {
      updateCuratedSet(editingSet.id, { name, filters, targetQuantity });
    } else {
      createCuratedSet(name, filters, targetQuantity);
    }
    setBuilderOpen(false);
  }

  if (status === "loading") return null;

  if (!session?.user) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Curated Sets</h1>
        </div>
        <EmptyState
          title="Sign in to see your Curated Sets"
          description={
            <>
              Build a personal chase list — by artist, set, or player — and track your progress toward
              completing it.{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Curated Sets</h1>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-3.5" /> New Curated Set
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : curatedSets.length === 0 ? (
        <EmptyState
          title="No Curated Sets yet"
          description="Build a chase list — every card by an artist, every variant of a set, a playset of a player's cards — and watch your progress toward completing it."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {curatedSets.map((set) => (
            <CuratedSetCard
              key={set.id}
              curatedSet={set}
              onEdit={() => openEdit(set)}
              onDelete={() => deleteCuratedSet(set.id)}
            />
          ))}
        </div>
      )}

      <CuratedSetBuilder
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        initialName={editingSet?.name}
        initialFilters={editingSet?.filters}
        initialTargetQuantity={editingSet?.targetQuantity}
        onSubmit={handleBuilderSubmit}
      />
    </div>
  );
}
