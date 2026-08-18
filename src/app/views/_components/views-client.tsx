"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Eye, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useViewsQuery, useViewsMutations } from "@/hooks/use-views";
import { getGameMeta } from "@/lib/games/registry";
import type { SavedView, ViewFilters } from "@/lib/views/types";
import { ViewBuilder } from "@/app/views/_components/view-builder";
import { ViewResults } from "@/app/views/_components/view-results";

/** One compact line describing what a View matches, e.g. "Pokémon · EN, JP · Yuka Morii, Sashiko Ito". */
function summarizeViewFilters(f: ViewFilters): string {
  const parts: string[] = [];
  if (f.q) parts.push(`"${f.q}"`);
  parts.push(f.game === "all" ? "All games" : (getGameMeta(f.game)?.name ?? f.game));
  if (f.type !== "all") parts.push(f.type === "CARD" ? "Cards only" : "Sealed only");
  if (f.cardTypes.length > 0) parts.push(f.cardTypes.join(", "));
  if (f.rarities.length > 0) parts.push(f.rarities.join(", "));
  if (f.languages.length > 0) parts.push(f.languages.join(", "));
  if (f.artists.length > 0) parts.push(f.artists.join(", "));
  if (f.baseOnly) parts.push("No parallels");
  return parts.join(" · ");
}

function EmptyState({ title, description }: { title: string; description: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-16 text-center">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ViewCard({
  view,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  view: SavedView;
  active: boolean;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2.5 transition-colors",
        active ? "border-primary/50 bg-primary/5" : "border-border bg-surface hover:bg-surface-elevated/50"
      )}
    >
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium">{view.name}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{summarizeViewFilters(view.filters)}</p>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label={`Actions for ${view.name}`}>
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onRename}>
            <Pencil className="size-4" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} variant="destructive">
            <Trash2 className="size-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function ViewsClient() {
  const { data: session, status } = useSession();
  const { data: views = [], isLoading } = useViewsQuery({ enabled: status === "authenticated" });
  const { createView, renameView, updateViewFilters, deleteView } = useViewsMutations();

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  // Clear the selection if the selected View disappears (e.g. deleted from
  // another tab) — adjusted during render, not a useEffect (same idiom as
  // explore-client.tsx's initialFiltersKey resync).
  const [prevViewIds, setPrevViewIds] = React.useState<string[]>([]);
  const viewIds = views.map((v) => v.id).join(",");
  if (viewIds !== prevViewIds.join(",")) {
    setPrevViewIds(views.map((v) => v.id));
    if (selectedId && !views.some((v) => v.id === selectedId)) setSelectedId(null);
  }

  const [builderOpen, setBuilderOpen] = React.useState(false);
  const [editingView, setEditingView] = React.useState<SavedView | null>(null);
  const [renamingView, setRenamingView] = React.useState<SavedView | null>(null);
  const [renameDraft, setRenameDraft] = React.useState("");

  const selected = views.find((v) => v.id === selectedId) ?? null;

  function openCreate() {
    setEditingView(null);
    setBuilderOpen(true);
  }

  function openEdit(view: SavedView) {
    setEditingView(view);
    setBuilderOpen(true);
  }

  function handleBuilderSubmit(name: string, filters: ViewFilters) {
    if (editingView) {
      renameView(editingView.id, name);
      updateViewFilters(editingView.id, filters);
    } else {
      const newId = createView(name, filters);
      setSelectedId(newId);
    }
    setBuilderOpen(false);
  }

  function handleRenameSubmit() {
    if (!renamingView) return;
    const trimmed = renameDraft.trim();
    if (!trimmed) return;
    renameView(renamingView.id, trimmed);
    setRenamingView(null);
  }

  function handleDelete(view: SavedView) {
    deleteView(view.id);
    if (selectedId === view.id) setSelectedId(null);
  }

  if (status === "loading") return null;

  if (!session?.user) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
        <div className="flex items-center gap-2">
          <Eye className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Views</h1>
        </div>
        <EmptyState
          title="Sign in to see your Views"
          description={
            <>
              Save reusable filter searches — like a card name, or an artist and language combination — and
              come back to them anytime.{" "}
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
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row">
      <aside className="w-full flex-none space-y-3 lg:w-72">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Views</h1>
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-3.5" /> New View
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : views.length === 0 ? (
          <EmptyState
            title="No Views yet"
            description="Build a filter search — like all cards by a specific artist, in a specific language — and save it here."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {views.map((view) => (
              <ViewCard
                key={view.id}
                view={view}
                active={view.id === selectedId}
                onSelect={() => setSelectedId(view.id)}
                onRename={() => {
                  setRenamingView(view);
                  setRenameDraft(view.name);
                }}
                onDelete={() => handleDelete(view)}
              />
            ))}
          </div>
        )}
      </aside>

      <div className="min-w-0 flex-1">
        {selected ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{selected.name}</h2>
              <Button variant="outline" size="sm" onClick={() => openEdit(selected)}>
                <Pencil className="size-3.5" /> Edit filters
              </Button>
            </div>
            <ViewResults view={selected} />
          </div>
        ) : (
          <EmptyState
            title="Select a View"
            description="Pick a View from the list, or create a new one, to see matching cards."
          />
        )}
      </div>

      <ViewBuilder
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        initialName={editingView?.name}
        initialFilters={editingView?.filters}
        onSubmit={handleBuilderSubmit}
      />

      <Dialog open={renamingView != null} onOpenChange={(open) => !open && setRenamingView(null)}>
        <DialogContent className="bg-surface border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename View</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit()}
            className="bg-background"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingView(null)}>
              Cancel
            </Button>
            <Button onClick={handleRenameSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
