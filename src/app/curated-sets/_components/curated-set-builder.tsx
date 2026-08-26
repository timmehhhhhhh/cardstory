"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { GAMES } from "@/lib/games/registry";
import { DEFAULT_CURATED_SET_FILTERS, type CuratedSetFilters } from "@/lib/curated-sets/types";
import type { CardTypeGroup, VariantGroup } from "@/lib/catalog/search";
import type { SetOption } from "@/app/api/catalog/sets/route";
import type { PokemonCuratedTemplateOption } from "@/app/api/curated-sets/pokemon-templates/route";

const WIRED_GAMES = GAMES.filter((g) => g.status === "WIRED");
const LANGUAGE_OPTIONS: { value: CuratedSetFilters["languages"][number]; label: string }[] = [
  { value: "EN", label: "English" },
  { value: "JP", label: "Japanese" },
  { value: "CN", label: "Chinese (Simplified)" },
  { value: "TW", label: "Chinese (Traditional)" },
  { value: "KR", label: "Korean" },
];

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * Create/edit form for a Curated Set — adapted from the Views multi-select
 * builder (src/app/views/_components/view-builder.tsx), with `game`/`set`
 * pluralized to checkbox multi-selects (a curated set can span several
 * games at once, e.g. "every Steve Argyle card across FAB & MTG"), a new
 * `variants` finish picker, and a `targetQuantity` field for playset-style
 * chases. No free-text search or sort — see CuratedSetFilters' doc comment.
 */
export function CuratedSetBuilder({
  open,
  onOpenChange,
  initialName,
  initialFilters,
  initialTargetQuantity,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  initialFilters?: CuratedSetFilters;
  initialTargetQuantity?: number;
  onSubmit: (name: string, filters: CuratedSetFilters, targetQuantity: number) => void;
}) {
  const [name, setName] = React.useState(initialName ?? "");
  const [filters, setFilters] = React.useState<CuratedSetFilters>(initialFilters ?? DEFAULT_CURATED_SET_FILTERS);
  const [targetQuantity, setTargetQuantity] = React.useState(initialTargetQuantity ?? 1);
  const [artistDraft, setArtistDraft] = React.useState("");

  // Reset local state whenever the sheet is (re)opened for a different
  // curated set (or a fresh create) — adjusted during render per
  // https://react.dev/learn/you-might-not-need-an-effect, same idiom as
  // view-builder.tsx.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName(initialName ?? "");
      setFilters(initialFilters ?? DEFAULT_CURATED_SET_FILTERS);
      setTargetQuantity(initialTargetQuantity ?? 1);
      setArtistDraft("");
    }
  }

  // The facet endpoints (card-types/rarities/variants) take a single
  // optional `game` — pass it through when exactly one game is selected,
  // otherwise fetch the union across every wired game (a small over-fetch
  // when 2+ games are picked, acceptable for a filter dropdown).
  const singleGame = filters.games.length === 1 ? filters.games[0] : undefined;
  const isSportsOnly =
    filters.games.length > 0 && filters.games.every((g) => WIRED_GAMES.find((w) => w.id === g)?.kind === "sports");

  const cardTypeQuery = useQuery<CardTypeGroup[]>({
    queryKey: ["catalog-card-types", singleGame],
    enabled: open,
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (singleGame) sp.set("game", singleGame);
      const res = await fetch(`/api/catalog/card-types?${sp.toString()}`);
      if (!res.ok) throw new Error("Failed to load card types");
      const json = (await res.json()) as { cardTypeGroups: CardTypeGroup[] };
      return json.cardTypeGroups;
    },
    placeholderData: (prev) => prev,
  });
  const cardTypes = Array.from(new Set(cardTypeQuery.data?.flatMap((g) => g.cardTypes) ?? []));

  const rarityQuery = useQuery<string[]>({
    queryKey: ["catalog-rarities", singleGame],
    enabled: open,
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (singleGame) sp.set("game", singleGame);
      const res = await fetch(`/api/catalog/rarities?${sp.toString()}`);
      if (!res.ok) throw new Error("Failed to load rarities");
      const json = (await res.json()) as { rarities: string[] };
      return json.rarities;
    },
    placeholderData: (prev) => prev,
  });
  const rarities = rarityQuery.data ?? [];

  const variantQuery = useQuery<VariantGroup[]>({
    queryKey: ["catalog-variants", singleGame],
    enabled: open,
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (singleGame) sp.set("game", singleGame);
      const res = await fetch(`/api/catalog/variants?${sp.toString()}`);
      if (!res.ok) throw new Error("Failed to load variants");
      const json = (await res.json()) as { variantGroups: VariantGroup[] };
      return json.variantGroups;
    },
    placeholderData: (prev) => prev,
  });
  const variants = Array.from(
    new Map(
      (variantQuery.data ?? []).flatMap((g) => g.variants.map((v) => [v.key, v.label] as const))
    ).entries()
  );

  const pokemonTemplatesQuery = useQuery<PokemonCuratedTemplateOption[]>({
    queryKey: ["curated-sets-pokemon-templates"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/curated-sets/pokemon-templates");
      if (!res.ok) throw new Error("Failed to load Pokémon templates");
      const json = (await res.json()) as { templates: PokemonCuratedTemplateOption[] };
      return json.templates;
    },
    staleTime: 60 * 60 * 1000,
  });
  const pokemonTemplates = pokemonTemplatesQuery.data ?? [];
  const activePokemonTemplateId = filters.groupByNationalPokedexNumber
    ? pokemonTemplates.find(
        (t) => JSON.stringify(t.dexNumbers) === JSON.stringify(filters.nationalPokedexNumbers)
      )?.id
    : undefined;

  const setsQuery = useQuery<SetOption[]>({
    queryKey: ["catalog-sets", filters.games.join(",")],
    enabled: open && filters.games.length > 0,
    queryFn: async () => {
      const sp = new URLSearchParams({ games: filters.games.join(",") });
      const res = await fetch(`/api/catalog/sets?${sp.toString()}`);
      if (!res.ok) throw new Error("Failed to load sets");
      const json = (await res.json()) as { setOptions: SetOption[] };
      return json.setOptions;
    },
    placeholderData: (prev) => prev,
  });
  const setOptions = setsQuery.data ?? [];

  const previewQuery = useQuery<{ total: number; truncated: boolean }>({
    queryKey: ["curated-set-preview", filters],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/curated-sets/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters }),
      });
      if (!res.ok) throw new Error("Failed to preview");
      return res.json();
    },
    placeholderData: (prev) => prev,
  });

  function addArtist() {
    const trimmed = artistDraft.trim();
    if (!trimmed) return;
    setFilters((f) => ({ ...f, artists: Array.from(new Set([...f.artists, trimmed])) }));
    setArtistDraft("");
  }

  function toggleGame(gameId: string) {
    setFilters((f) => {
      const nextGames = toggleValue(f.games, gameId);
      const turnedOff = !nextGames.includes(gameId);
      // Deselecting Pokémon (or adding a second game alongside it) leaves a
      // species-grouped Living Dex/Eeveelutions/Starters selection nonsense
      // — clear it rather than silently querying the wrong game(s).
      const pokemonStillSoleGame = nextGames.length === 1 && nextGames[0] === "pokemon";
      return {
        ...f,
        games: nextGames,
        // Drop that game's set selections once it's deselected — a set id
        // for a game no longer in scope would otherwise silently narrow
        // nothing (see resolveCuratedSetMatches, which only ever looks at
        // sets belonging to a queried game).
        sets: turnedOff ? f.sets.filter((s) => !s.startsWith(`${gameId}:`)) : f.sets,
        cardTypes: [],
        rarities: [],
        variants: [],
        nationalPokedexNumbers: pokemonStillSoleGame ? f.nationalPokedexNumbers : [],
        groupByNationalPokedexNumber: pokemonStillSoleGame ? f.groupByNationalPokedexNumber : false,
      };
    });
  }

  function applyPokemonTemplate(template: PokemonCuratedTemplateOption) {
    setFilters((f) => ({
      ...f,
      games: ["pokemon"],
      cardTypes: ["Pokémon", "Pokémon · Basic"],
      nationalPokedexNumbers: template.dexNumbers,
      groupByNationalPokedexNumber: true,
    }));
  }

  function clearPokemonTemplate() {
    setFilters((f) => ({ ...f, nationalPokedexNumbers: [], groupByNationalPokedexNumber: false }));
  }

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed, filters, targetQuantity);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto bg-background border-border sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{initialName ? "Edit Curated Set" : "New Curated Set"}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 pb-4">
          <div>
            <Label htmlFor="curated-set-name" className="mb-1.5 block text-sm font-medium">
              Name
            </Label>
            <Input
              id="curated-set-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Steve Argyle: MTG & FAB"
              className="bg-surface border-border"
            />
          </div>

          <div>
            <Label htmlFor="curated-set-target" className="mb-1.5 block text-sm font-medium">
              Copies of each card to collect
            </Label>
            <Input
              id="curated-set-target"
              type="number"
              min={1}
              max={20}
              value={targetQuantity}
              onChange={(e) => setTargetQuantity(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              className="bg-surface border-border w-24"
            />
            <p className="mt-1 text-xs text-muted-foreground">1 for a single-copy chase, 3 for a playset, etc.</p>
          </div>

          <Separator />

          <div>
            <h3 className="mb-2 text-sm font-semibold">Pokémon Collections</h3>
            <p className="mb-2 text-xs text-muted-foreground">
              Quick-start a species checklist — own any one card per Pokémon to check it off.
            </p>
            <div className="flex flex-wrap gap-2">
              {pokemonTemplates.map((t) => (
                <Button
                  key={t.id}
                  type="button"
                  size="sm"
                  variant={activePokemonTemplateId === t.id ? "default" : "outline"}
                  title={t.description}
                  onClick={() => applyPokemonTemplate(t)}
                >
                  {t.label} · {t.dexNumbers.length.toLocaleString()}
                </Button>
              ))}
              {filters.groupByNationalPokedexNumber && (
                <Button type="button" size="sm" variant="ghost" onClick={clearPokemonTemplate}>
                  <X className="size-3.5" /> Clear
                </Button>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="mb-2 text-sm font-semibold">Games</h3>
            <p className="mb-2 text-xs text-muted-foreground">
              Leave all unchecked to match every game. Match any of the selected games.
            </p>
            <div className="flex flex-col gap-2">
              {WIRED_GAMES.map((g) => (
                <label key={g.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox checked={filters.games.includes(g.id)} onCheckedChange={() => toggleGame(g.id)} />
                  {g.name}
                </label>
              ))}
            </div>
          </div>

          {setOptions.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="mb-2 text-sm font-semibold">Sets</h3>
                <p className="mb-2 text-xs text-muted-foreground">
                  Leave unchecked to match every set in the selected games.
                </p>
                <div className="flex max-h-56 flex-col gap-3 overflow-y-auto pr-1">
                  {setOptions.map((group) => (
                    <div key={group.gameId}>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">{group.gameName}</p>
                      <div className="flex flex-col gap-1.5">
                        {group.sets.map((s) => (
                          <label key={s.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Checkbox
                              checked={filters.sets.includes(s.id)}
                              onCheckedChange={() => setFilters((f) => ({ ...f, sets: toggleValue(f.sets, s.id) }))}
                            />
                            {s.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          <div>
            <h3 className="mb-2 text-sm font-semibold">Product Type</h3>
            <RadioGroup
              value={filters.type}
              onValueChange={(v) => setFilters((f) => ({ ...f, type: v as CuratedSetFilters["type"] }))}
              className="gap-2"
            >
              <label className="flex items-center gap-2 text-sm text-muted-foreground has-[[data-state=checked]]:text-foreground">
                <RadioGroupItem value="all" /> All products
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground has-[[data-state=checked]]:text-foreground">
                <RadioGroupItem value="CARD" /> Cards only
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground has-[[data-state=checked]]:text-foreground">
                <RadioGroupItem value="SEALED" /> Sealed only
              </label>
            </RadioGroup>
          </div>

          {cardTypes.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="mb-2 text-sm font-semibold">Card Type</h3>
                <p className="mb-2 text-xs text-muted-foreground">Match any of the selected types.</p>
                <div className="flex max-h-48 flex-col gap-2 overflow-y-auto pr-1">
                  {cardTypes.map((ct) => (
                    <label key={ct} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Checkbox
                        checked={filters.cardTypes.includes(ct)}
                        onCheckedChange={() =>
                          setFilters((f) => ({ ...f, cardTypes: toggleValue(f.cardTypes, ct) }))
                        }
                      />
                      {ct}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {rarities.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="mb-2 text-sm font-semibold">Rarity</h3>
                <p className="mb-2 text-xs text-muted-foreground">Match any of the selected rarities.</p>
                <div className="flex max-h-48 flex-col gap-2 overflow-y-auto pr-1">
                  {rarities.map((r) => (
                    <label key={r} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Checkbox
                        checked={filters.rarities.includes(r)}
                        onCheckedChange={() =>
                          setFilters((f) => ({ ...f, rarities: toggleValue(f.rarities, r) }))
                        }
                      />
                      {r}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {variants.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="mb-2 text-sm font-semibold">Variants</h3>
                <p className="mb-2 text-xs text-muted-foreground">
                  Leave unchecked to match every variant/finish (non-foil, holo, 1st edition holo, etc.).
                </p>
                <div className="flex max-h-48 flex-col gap-2 overflow-y-auto pr-1">
                  {variants.map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Checkbox
                        checked={filters.variants.includes(value)}
                        onCheckedChange={() =>
                          setFilters((f) => ({ ...f, variants: toggleValue(f.variants, value) }))
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          <div>
            <h3 className="mb-2 text-sm font-semibold">Language</h3>
            <p className="mb-2 text-xs text-muted-foreground">Match any of the selected languages.</p>
            <div className="flex flex-col gap-2">
              {LANGUAGE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={filters.languages.includes(opt.value)}
                    onCheckedChange={() =>
                      setFilters((f) => ({ ...f, languages: toggleValue(f.languages, opt.value) }))
                    }
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {!isSportsOnly && (
            <>
              <Separator />
              <div>
                <h3 className="mb-2 text-sm font-semibold">Artist</h3>
                <p className="mb-2 text-xs text-muted-foreground">
                  Type a name and press Enter. Matches any of the artists you add.
                </p>
                <Input
                  value={artistDraft}
                  onChange={(e) => setArtistDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addArtist();
                    }
                  }}
                  placeholder="e.g. Steve Argyle"
                  className="bg-surface border-border"
                />
                {filters.artists.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {filters.artists.map((a) => (
                      <Badge key={a} variant="outline" className="gap-1 h-6">
                        {a}
                        <button
                          type="button"
                          aria-label={`Remove ${a}`}
                          onClick={() =>
                            setFilters((f) => ({ ...f, artists: f.artists.filter((x) => x !== a) }))
                          }
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {(filters.games.length === 0 || isSportsOnly) && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="curated-set-base-only" className="text-sm font-medium">
                    Show all parallels
                  </Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Sports cards only — by default each card matches once; open it to see every parallel/refractor.
                  </p>
                </div>
                <Switch
                  id="curated-set-base-only"
                  checked={!filters.baseOnly}
                  onCheckedChange={(v) => setFilters((f) => ({ ...f, baseOnly: !v }))}
                />
              </div>
            </>
          )}
        </div>

        <SheetFooter className="flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {previewQuery.isLoading
              ? "Matching…"
              : `Matches ≈${(previewQuery.data?.total ?? 0).toLocaleString()} cards${
                  previewQuery.data?.truncated ? " (capped — narrow your filters)" : ""
                }`}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>{initialName ? "Update" : "Save"}</Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
