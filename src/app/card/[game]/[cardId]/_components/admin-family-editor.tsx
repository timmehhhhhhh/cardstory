"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Loader2, Search, ShieldCheck, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CardImage } from "@/components/cards/card-image";
import { cn } from "@/lib/utils";
import type { CatalogSearchItem } from "@/lib/catalog/search";

const SEARCH_DEBOUNCE_MS = 300;

export interface FamilyMemberSummary {
  id: string;
  gameId: string;
  name: string;
}

/**
 * Admin-only tool for correcting/growing a card's cardFamilyId links (see
 * that field's doc comment in prisma/schema.prisma) — the manual path
 * alongside scripts/backfill-catalog-family.ts's Pokémon-only heuristic.
 * Only ever rendered by the parent page when session.user.isAdmin is true
 * (checked server-side there, not just hidden client-side here).
 *
 * A collapsed-by-default disclosure rather than a dialog: this is a rare,
 * admin-only action that shouldn't compete for attention with the
 * collector-facing panels above it.
 */
export function AdminFamilyEditor({
  currentCardId,
  currentCardName,
  members,
}: {
  currentCardId: string;
  currentCardName: string;
  members: FamilyMemberSummary[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<CatalogSearchItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      const trimmed = query.trim();
      if (!trimmed) {
        if (!cancelled) {
          setResults([]);
          setLoading(false);
        }
        return;
      }
      if (!cancelled) setLoading(true);
      fetch(`/api/catalog/search?q=${encodeURIComponent(trimmed)}&pageSize=20`)
        .then((res) => (res.ok ? res.json() : { items: [] }))
        .then((data: { items: CatalogSearchItem[] }) => {
          if (!cancelled) setResults(data.items.filter((r) => r.id !== currentCardId));
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open, currentCardId]);

  async function link(targetId: string) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/card-family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: currentCardId, targetId }),
      });
      if (!res.ok) throw new Error("Failed to link");
      setQuery("");
      setResults([]);
      router.refresh();
    } catch {
      setError("Couldn't link that card — try again.");
    } finally {
      setPending(false);
    }
  }

  async function unlink(cardId: string) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/card-family", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId }),
      });
      if (!res.ok) throw new Error("Failed to unlink");
      router.refresh();
    } catch {
      setError("Couldn't unlink that card — try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-dashed border-border/80 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        <ShieldCheck className="size-3.5" />
        Admin: Manage card family
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          {members.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-muted-foreground">Current family members ({members.length})</p>
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5"
                >
                  <span className="truncate text-sm">{m.name}</span>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => unlink(m.id)}
                    aria-label={`Unlink ${m.name} from ${currentCardName}'s family`}
                    className="flex-none rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-negative disabled:opacity-40"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a card to link…"
              className="bg-background pl-8"
            />
          </div>

          <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Searching…
              </div>
            )}
            {!loading && query.trim() && results.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">No matches.</p>
            )}
            {!loading &&
              results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  disabled={pending}
                  onClick={() => link(r.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-left hover:border-primary/40 hover:bg-surface-elevated",
                    pending && "opacity-60"
                  )}
                >
                  <div className="relative h-14 w-10 flex-none overflow-hidden rounded bg-muted">
                    <CardImage src={r.imageSmallUrl} alt="" className="object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="min-w-0 truncate text-sm font-medium">{r.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.setName}</p>
                  </div>
                </button>
              ))}
          </div>

          {error && <p className="text-xs text-negative">{error}</p>}
        </div>
      )}
    </div>
  );
}
