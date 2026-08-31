"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, Loader2, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardImage } from "@/components/cards/card-image";
import { cn } from "@/lib/utils";
import type { GameMeta } from "@/lib/games/registry";
import type { CatalogSearchItem } from "@/lib/catalog/search";

const SEARCH_DEBOUNCE_MS = 300;

interface SetOption {
  id: string;
  name: string;
  nameEn: string | null;
  code: string;
}

const EMPTY_FIELDS = {
  name: "",
  nameEn: "",
  number: "",
  rarity: "",
  artist: "",
  cardType: "",
  language: "EN",
  productType: "CARD" as "CARD" | "SEALED",
  imageSmallUrl: "",
  imageLargeUrl: "",
};

const EMPTY_NEW_SET = { name: "", code: "", nameEn: "" };

/**
 * Admin-only tool for hand-adding a CatalogItem a user pointed out is
 * missing from the catalog — no LLM/AI calls, no external API calls, just a
 * validated form straight into the DB via
 * src/app/api/admin/add-card/route.ts. Only ever rendered by
 * SettingsClient when session.user.isAdmin is true.
 *
 * Structurally modeled on AdminFamilyEditor
 * (src/app/card/[game]/[cardId]/_components/admin-family-editor.tsx): a
 * collapsed-by-default disclosure with the same debounced catalog-search
 * pattern, reused here as a duplicate check before creating anything.
 */
export function AdminAddCard({ games }: { games: GameMeta[] }) {
  const [open, setOpen] = React.useState(false);
  const [gameId, setGameId] = React.useState(games[0]?.id ?? "");

  const [dupQuery, setDupQuery] = React.useState("");
  const [dupResults, setDupResults] = React.useState<CatalogSearchItem[]>([]);
  const [dupLoading, setDupLoading] = React.useState(false);

  const [sets, setSets] = React.useState<SetOption[]>([]);
  const [setsLoading, setSetsLoading] = React.useState(false);
  const [setId, setSetId] = React.useState("");
  const [creatingSet, setCreatingSet] = React.useState(false);
  const [newSet, setNewSet] = React.useState(EMPTY_NEW_SET);

  const [fields, setFields] = React.useState(EMPTY_FIELDS);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Duplicate-check search, debounced — same pattern/timing as
  // AdminFamilyEditor's card-family search.
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      const trimmed = dupQuery.trim();
      if (!trimmed) {
        if (!cancelled) setDupResults([]);
        return;
      }
      setDupLoading(true);
      fetch(`/api/catalog/search?q=${encodeURIComponent(trimmed)}&game=${encodeURIComponent(gameId)}&pageSize=10`)
        .then((res) => (res.ok ? res.json() : { items: [] }))
        .then((data: { items: CatalogSearchItem[] }) => {
          if (!cancelled) setDupResults(data.items);
        })
        .catch(() => {
          if (!cancelled) setDupResults([]);
        })
        .finally(() => {
          if (!cancelled) setDupLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dupQuery, open, gameId]);

  // Sets available for the chosen game, for the picker. The state updates
  // are deferred into a microtask (not called synchronously in the effect
  // body) to avoid the cascading-render lint rule — same reasoning as the
  // debounce timer above, just with a zero-length "timer".
  React.useEffect(() => {
    if (!open || !gameId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setSetsLoading(true);
      setSetId("");
      fetch(`/api/admin/add-card?game=${encodeURIComponent(gameId)}`)
        .then((res) => (res.ok ? res.json() : { sets: [] }))
        .then((data: { sets: SetOption[] }) => {
          if (!cancelled) setSets(data.sets);
        })
        .catch(() => {
          if (!cancelled) setSets([]);
        })
        .finally(() => {
          if (!cancelled) setSetsLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [open, gameId]);

  function updateField<K extends keyof typeof fields>(key: K, value: (typeof fields)[K]) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fields.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!creatingSet && !setId) {
      setError("Pick a set, or switch to creating a new one.");
      return;
    }
    if (creatingSet && (!newSet.name.trim() || !newSet.code.trim())) {
      setError("New set needs a name and a code.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/admin/add-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          ...(creatingSet
            ? {
                newSet: {
                  name: newSet.name.trim(),
                  code: newSet.code.trim(),
                  nameEn: newSet.nameEn.trim() || undefined,
                },
              }
            : { setId }),
          name: fields.name.trim(),
          nameEn: fields.nameEn.trim() || undefined,
          number: fields.number.trim() || undefined,
          rarity: fields.rarity.trim() || undefined,
          artist: fields.artist.trim() || undefined,
          cardType: fields.cardType.trim() || undefined,
          language: fields.language.trim() || undefined,
          productType: fields.productType,
          imageSmallUrl: fields.imageSmallUrl.trim() || undefined,
          imageLargeUrl: fields.imageLargeUrl.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to add card");

      toast.success("Card added", {
        description: fields.name,
        action: { label: "View", onClick: () => window.open(`/card/${data.gameId}/${data.id}`, "_blank") },
      });
      setFields(EMPTY_FIELDS);
      setNewSet(EMPTY_NEW_SET);
      setCreatingSet(false);
      setDupQuery("");
      setDupResults([]);
      // Refresh the set list in case a new one was just created.
      setSetId("");
      if (gameId) {
        fetch(`/api/admin/add-card?game=${encodeURIComponent(gameId)}`)
          .then((r) => (r.ok ? r.json() : { sets: [] }))
          .then((d: { sets: SetOption[] }) => setSets(d.sets))
          .catch(() => {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that card — try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Admin</h2>
      </div>

      <div className="rounded-xl border border-dashed border-border/80 p-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-1.5 text-left text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          Add a missing card
        </button>

        {open && (
          <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-add-card-game">Game</Label>
              <select
                id="admin-add-card-game"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm"
              >
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-add-card-dupcheck">Check it&rsquo;s not already here</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="admin-add-card-dupcheck"
                  value={dupQuery}
                  onChange={(e) => setDupQuery(e.target.value)}
                  placeholder="Search this game's existing cards…"
                  className="pl-8"
                />
              </div>
              {(dupLoading || dupResults.length > 0) && (
                <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto rounded-lg border border-border bg-surface p-1.5">
                  {dupLoading && (
                    <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" /> Searching…
                    </div>
                  )}
                  {!dupLoading &&
                    dupResults.map((r) => (
                      <div key={r.id} className="flex items-center gap-3 rounded-md px-2 py-1.5">
                        <div className="relative h-12 w-9 flex-none overflow-hidden rounded bg-muted">
                          <CardImage src={r.imageSmallUrl} alt="" className="object-contain" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="min-w-0 truncate text-sm font-medium">{r.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{r.setName}</p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label>Set</Label>
                <button
                  type="button"
                  onClick={() => setCreatingSet((v) => !v)}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  {creatingSet ? "Pick an existing set instead" : "+ New set"}
                </button>
              </div>

              {creatingSet ? (
                <div className="flex flex-col gap-2">
                  <Input
                    value={newSet.name}
                    onChange={(e) => setNewSet((s) => ({ ...s, name: e.target.value }))}
                    placeholder="Set name, e.g. S-P Promos (JP)"
                  />
                  <Input
                    value={newSet.code}
                    onChange={(e) => setNewSet((s) => ({ ...s, code: e.target.value }))}
                    placeholder="Set code (unique per game), e.g. jp-sp"
                  />
                  <Input
                    value={newSet.nameEn}
                    onChange={(e) => setNewSet((s) => ({ ...s, nameEn: e.target.value }))}
                    placeholder="English name (optional)"
                  />
                </div>
              ) : (
                <select
                  value={setId}
                  onChange={(e) => setSetId(e.target.value)}
                  disabled={setsLoading}
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm disabled:opacity-60"
                >
                  <option value="">{setsLoading ? "Loading sets…" : "Select a set…"}</option>
                  {sets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.nameEn && s.nameEn !== s.name ? ` (${s.nameEn})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="admin-add-card-name">Name</Label>
                <Input
                  id="admin-add-card-name"
                  value={fields.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Card name"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="admin-add-card-name-en">English name</Label>
                <Input
                  id="admin-add-card-name-en"
                  value={fields.nameEn}
                  onChange={(e) => updateField("nameEn", e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="admin-add-card-number">Number</Label>
                <Input
                  id="admin-add-card-number"
                  value={fields.number}
                  onChange={(e) => updateField("number", e.target.value)}
                  placeholder="e.g. 232/S-P"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="admin-add-card-rarity">Rarity</Label>
                <Input
                  id="admin-add-card-rarity"
                  value={fields.rarity}
                  onChange={(e) => updateField("rarity", e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="admin-add-card-artist">Artist</Label>
                <Input
                  id="admin-add-card-artist"
                  value={fields.artist}
                  onChange={(e) => updateField("artist", e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="admin-add-card-type">Card type</Label>
                <Input
                  id="admin-add-card-type"
                  value={fields.cardType}
                  onChange={(e) => updateField("cardType", e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="admin-add-card-language">Language</Label>
                <Input
                  id="admin-add-card-language"
                  value={fields.language}
                  onChange={(e) => updateField("language", e.target.value.toUpperCase())}
                  placeholder="EN / JP / CN / TW / KR"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="admin-add-card-product-type">Product type</Label>
                <select
                  id="admin-add-card-product-type"
                  value={fields.productType}
                  onChange={(e) => updateField("productType", e.target.value as "CARD" | "SEALED")}
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="CARD">Card</option>
                  <option value="SEALED">Sealed</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="admin-add-card-image-small">Image URL (small)</Label>
                <Input
                  id="admin-add-card-image-small"
                  value={fields.imageSmallUrl}
                  onChange={(e) => updateField("imageSmallUrl", e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="admin-add-card-image-large">Image URL (large)</Label>
                <Input
                  id="admin-add-card-image-large"
                  value={fields.imageLargeUrl}
                  onChange={(e) => updateField("imageLargeUrl", e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            {error && <p className="text-sm text-negative">{error}</p>}

            <button
              type="submit"
              disabled={pending}
              className={cn(
                "self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90",
                pending && "opacity-60"
              )}
            >
              {pending ? "Adding…" : "Add card"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
