"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
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
import { SortDropdown } from "@/app/explore/_components/sort-dropdown";
import { GAMES, getGameMeta } from "@/lib/games/registry";
import { DEFAULT_VIEW_FILTERS, type ViewFilters } from "@/lib/views/types";
import type { CardTypeGroup } from "@/lib/catalog/search";

const WIRED_GAMES = GAMES.filter((g) => g.status === "WIRED");
const LANGUAGE_OPTIONS: { value: ViewFilters["languages"][number]; label: string }[] = [
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
 * Create/edit form for a saved View — the multi-select counterpart to
 * Explore's single-select SidebarFilters (src/app/explore/_components/
 * sidebar-filters.tsx). Controlled useState throughout, no react-hook-form,
 * matching the rest of the app's forms.
 */
export function ViewBuilder({
  open,
  onOpenChange,
  initialName,
  initialFilters,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  initialFilters?: ViewFilters;
  onSubmit: (name: string, filters: ViewFilters) => void;
}) {
  const [name, setName] = React.useState(initialName ?? "");
  const [filters, setFilters] = React.useState<ViewFilters>(initialFilters ?? DEFAULT_VIEW_FILTERS);
  const [artistDraft, setArtistDraft] = React.useState("");

  // Reset the form's local state whenever the sheet is (re)opened for a
  // different View (or for a fresh create) — adjusted during render per
  // https://react.dev/learn/you-might-not-need-an-effect, same idiom used
  // throughout explore-client.tsx/sidebar-filters.tsx, not a useEffect.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName(initialName ?? "");
      setFilters(initialFilters ?? DEFAULT_VIEW_FILTERS);
      setArtistDraft("");
    }
  }

  const isSports = getGameMeta(filters.game)?.kind === "sports";

  const cardTypeQuery = useQuery<CardTypeGroup[]>({
    queryKey: ["catalog-card-types", filters.game],
    enabled: open,
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (filters.game !== "all") sp.set("game", filters.game);
      const res = await fetch(`/api/catalog/card-types?${sp.toString()}`);
      if (!res.ok) throw new Error("Failed to load card types");
      const json = await res.json();
      return json.cardTypeGroups as CardTypeGroup[];
    },
    placeholderData: (prev) => prev,
  });
  const cardTypes = cardTypeQuery.data?.[0]?.cardTypes ?? [];

  const rarityQuery = useQuery<string[]>({
    queryKey: ["catalog-rarities", filters.game],
    enabled: open,
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (filters.game !== "all") sp.set("game", filters.game);
      const res = await fetch(`/api/catalog/rarities?${sp.toString()}`);
      if (!res.ok) throw new Error("Failed to load rarities");
      const json = await res.json();
      return json.rarities as string[];
    },
    placeholderData: (prev) => prev,
  });
  const rarities = rarityQuery.data ?? [];

  function addArtist() {
    const trimmed = artistDraft.trim();
    if (!trimmed) return;
    setFilters((f) => ({ ...f, artists: Array.from(new Set([...f.artists, trimmed])) }));
    setArtistDraft("");
  }

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed, filters);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto bg-background border-border sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{initialName ? "Edit View" : "New View"}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 pb-4">
          <div>
            <Label htmlFor="view-name" className="mb-1.5 block text-sm font-medium">
              Name
            </Label>
            <Input
              id="view-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Munchlax cards"
              className="bg-surface border-border"
            />
          </div>

          <div>
            <Label htmlFor="view-q" className="mb-1.5 block text-sm font-medium">
              Search text
            </Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="view-q"
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                placeholder="Matches card name, number, or artist…"
                className="bg-surface border-border pl-8"
              />
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="mb-2 text-sm font-semibold">Game</h3>
            <RadioGroup
              value={filters.game}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, game: v, cardTypes: [], rarities: [] }))
              }
              className="gap-2"
            >
              <label className="flex items-center gap-2 text-sm text-muted-foreground has-[[data-state=checked]]:text-foreground">
                <RadioGroupItem value="all" /> All games
              </label>
              {WIRED_GAMES.map((g) => (
                <label
                  key={g.id}
                  className="flex items-center gap-2 text-sm text-muted-foreground has-[[data-state=checked]]:text-foreground"
                >
                  <RadioGroupItem value={g.id} /> {g.name}
                </label>
              ))}
            </RadioGroup>
          </div>

          <Separator />

          <div>
            <h3 className="mb-2 text-sm font-semibold">Product Type</h3>
            <RadioGroup
              value={filters.type}
              onValueChange={(v) => setFilters((f) => ({ ...f, type: v as ViewFilters["type"] }))}
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

          {!isSports && (
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
                  placeholder="e.g. Yuka Morii"
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

          {(filters.game === "all" || isSports) && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="view-base-only" className="text-sm font-medium">
                    Hide parallels
                  </Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Sports cards only — show just each card&apos;s base version.
                  </p>
                </div>
                <Switch
                  id="view-base-only"
                  checked={filters.baseOnly}
                  onCheckedChange={(v) => setFilters((f) => ({ ...f, baseOnly: v }))}
                />
              </div>
            </>
          )}

          <Separator />

          <div>
            <h3 className="mb-2 text-sm font-semibold">Sort</h3>
            <SortDropdown value={filters.sort} onChange={(sort) => setFilters((f) => ({ ...f, sort }))} />
          </div>
        </div>

        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{initialName ? "Update View" : "Save View"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
