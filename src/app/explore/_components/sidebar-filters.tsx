"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { GAMES, getGameMeta } from "@/lib/games/registry";
import type { ExploreFilters } from "@/app/explore/_components/types";
import type { CardTypeGroup, VariantGroup } from "@/lib/catalog/search";
import { RIFTBOUND_RARITY_LABEL } from "@/lib/games/riftbound/rarity";
import { DomainIcon } from "@/components/cards/riftbound-icons";

const WIRED_GAMES = GAMES.filter((g) => g.status === "WIRED");

export function SidebarFilters({
  filters,
  onChange,
  cardTypeGroups = [],
  rarityOptions = [],
  domainOptions = [],
  variantGroups = [],
}: {
  filters: ExploreFilters;
  onChange: (patch: Partial<ExploreFilters>) => void;
  cardTypeGroups?: CardTypeGroup[];
  rarityOptions?: string[];
  domainOptions?: string[];
  variantGroups?: VariantGroup[];
}) {
  const [qDraft, setQDraft] = React.useState(filters.q);
  // Reset the draft when filters.q changes from outside this component
  // (e.g. Clear button, browser back/forward) — adjusted during render per
  // https://react.dev/learn/you-might-not-need-an-effect, not in an effect.
  const [prevFiltersQ, setPrevFiltersQ] = React.useState(filters.q);
  if (filters.q !== prevFiltersQ) {
    setPrevFiltersQ(filters.q);
    setQDraft(filters.q);
  }

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (qDraft !== filters.q) onChange({ q: qDraft, page: 1 });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDraft]);

  return (
    <aside className="w-full flex-none space-y-5 lg:w-64">
      <div>
        <h2 className="mb-2 text-sm font-semibold">Find a Product</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            placeholder="Search any card or sealed product…"
            className="bg-surface border-border pl-8 pr-8"
          />
          {qDraft && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQDraft("");
                onChange({ q: "", page: 1 });
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <Label htmlFor="watchlist-toggle" className="text-sm font-medium">
          Watchlist only
        </Label>
        <Switch
          id="watchlist-toggle"
          checked={filters.watchlistOnly}
          onCheckedChange={(v) => onChange({ watchlistOnly: v, page: 1 })}
        />
      </div>

      {rarityOptions.includes("Promo") && (
        <>
          <Separator />

          <div className="flex items-center justify-between">
            <Label htmlFor="promo-toggle" className="text-sm font-medium">
              Promos only
            </Label>
            <Switch
              id="promo-toggle"
              checked={filters.rarity === "Promo"}
              onCheckedChange={(v) => onChange({ rarity: v ? "Promo" : "all", page: 1 })}
            />
          </div>
        </>
      )}

      <Separator />

      <div>
        <h3 className="mb-2 text-sm font-semibold">Game</h3>
        <RadioGroup
          value={filters.game}
          onValueChange={(v) =>
            onChange({
              game: v,
              page: 1,
              rarity: "all",
              domain: "all",
              cardType: "all",
              variant: "all",
            })
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
        <p className="mb-2 text-xs text-muted-foreground">Filter by type of product.</p>
        <RadioGroup
          value={filters.type}
          onValueChange={(v) => onChange({ type: v as ExploreFilters["type"], page: 1 })}
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

      {(filters.game === "all" || getGameMeta(filters.game)?.kind === "sports") && (
        <>
          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="base-only-toggle" className="text-sm font-medium">
                Hide parallels
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Sports cards only — show just each card&apos;s base version.
              </p>
            </div>
            <Switch
              id="base-only-toggle"
              checked={filters.baseOnly}
              onCheckedChange={(v) => onChange({ baseOnly: v, page: 1 })}
            />
          </div>
        </>
      )}

      {cardTypeGroups.length > 0 && (
        <>
          <Separator />

          <div>
            <h3 className="mb-2 text-sm font-semibold">Card Type</h3>
            <p className="mb-2 text-xs text-muted-foreground">Not available for every game.</p>
            <Select
              value={filters.cardType}
              onValueChange={(v) => onChange({ cardType: v, page: 1 })}
            >
              <SelectTrigger className="w-full bg-surface border-border">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {filters.game === "all" ? (
                  // Multiple games in play — group by game with a subheading
                  // inside the single dropdown, so the list doesn't turn into
                  // one long, undifferentiated mix of every game's taxonomy.
                  cardTypeGroups.map((group) => (
                    <SelectGroup key={group.gameId}>
                      <SelectLabel>{group.gameName}</SelectLabel>
                      {group.cardTypes.map((ct) => (
                        <SelectItem key={ct} value={ct}>
                          {ct}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))
                ) : (
                  // A single game is selected — its group (if any) is all there
                  // is to show, so render it flat with no redundant heading.
                  cardTypeGroups[0]?.cardTypes.map((ct) => (
                    <SelectItem key={ct} value={ct}>
                      {ct}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {variantGroups.length > 0 && (
        <>
          <Separator />

          <div>
            <h3 className="mb-2 text-sm font-semibold">Variation</h3>
            <p className="mb-2 text-xs text-muted-foreground">
              A card&apos;s priced finish — Holofoil, Reverse Holo, 1st Edition, and so on.
            </p>
            <Select
              value={filters.variant}
              onValueChange={(v) => onChange({ variant: v, page: 1 })}
            >
              <SelectTrigger className="w-full bg-surface border-border">
                <SelectValue placeholder="All variations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All variations</SelectItem>
                {filters.game === "all" ? (
                  // Same per-game subheading grouping as Card Type above.
                  variantGroups.map((group) => (
                    <SelectGroup key={group.gameId}>
                      <SelectLabel>{group.gameName}</SelectLabel>
                      {group.variants.map((v) => (
                        <SelectItem key={v.key} value={v.key}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))
                ) : (
                  // A single game is selected — its group (if any) is all there
                  // is to show, so render it flat with no redundant heading.
                  variantGroups[0]?.variants.map((v) => (
                    <SelectItem key={v.key} value={v.key}>
                      {v.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {rarityOptions.length > 0 && (
        <>
          <Separator />

          <div>
            <h3 className="mb-2 text-sm font-semibold">Rarity</h3>
            <RadioGroup
              value={filters.rarity}
              onValueChange={(v) => onChange({ rarity: v, page: 1 })}
              className="gap-2 max-h-64 overflow-y-auto pr-1"
            >
              <label className="flex items-center gap-2 text-sm text-muted-foreground has-[[data-state=checked]]:text-foreground">
                <RadioGroupItem value="all" /> All rarities
              </label>
              {rarityOptions.map((r) => (
                <label
                  key={r}
                  className="flex items-center gap-2 text-sm text-muted-foreground has-[[data-state=checked]]:text-foreground"
                >
                  <RadioGroupItem value={r} />
                  {RIFTBOUND_RARITY_LABEL[r] ?? r}
                </label>
              ))}
            </RadioGroup>
          </div>
        </>
      )}

      {domainOptions.length > 0 && (
        <>
          <Separator />

          <div>
            <h3 className="mb-2 text-sm font-semibold">Domain</h3>
            <p className="mb-2 text-xs text-muted-foreground">Riftbound only.</p>
            <RadioGroup
              value={filters.domain}
              onValueChange={(v) => onChange({ domain: v, page: 1 })}
              className="gap-2 max-h-64 overflow-y-auto pr-1"
            >
              <label className="flex items-center gap-2 text-sm text-muted-foreground has-[[data-state=checked]]:text-foreground">
                <RadioGroupItem value="all" /> All domains
              </label>
              {domainOptions.map((d) => (
                <label
                  key={d}
                  className="flex items-center gap-2 text-sm text-muted-foreground has-[[data-state=checked]]:text-foreground"
                >
                  <RadioGroupItem value={d} />
                  <DomainIcon domain={d} />
                  {d}
                </label>
              ))}
            </RadioGroup>
          </div>
        </>
      )}

      <Separator />

      <div>
        <h3 className="mb-2 text-sm font-semibold">Language</h3>
        <p className="mb-2 text-xs text-muted-foreground">Pokémon only — other games are English-only.</p>
        <RadioGroup
          value={filters.language}
          onValueChange={(v) => onChange({ language: v as ExploreFilters["language"], page: 1 })}
          className="gap-2"
        >
          <label className="flex items-center gap-2 text-sm text-muted-foreground has-[[data-state=checked]]:text-foreground">
            <RadioGroupItem value="all" /> All languages
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground has-[[data-state=checked]]:text-foreground">
            <RadioGroupItem value="EN" /> English
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground has-[[data-state=checked]]:text-foreground">
            <RadioGroupItem value="JP" /> Japanese
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground has-[[data-state=checked]]:text-foreground">
            <RadioGroupItem value="CN" /> Chinese (Simplified)
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground has-[[data-state=checked]]:text-foreground">
            <RadioGroupItem value="TW" /> Chinese (Traditional)
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground has-[[data-state=checked]]:text-foreground">
            <RadioGroupItem value="KR" /> Korean
          </label>
        </RadioGroup>
      </div>

      <Separator />

      <div>
        <h3 className="mb-2 text-sm font-semibold">Product Status in Your PC</h3>
        <p className="mb-2 text-xs text-muted-foreground">
          Filter by inventory status within your currently selected PC.
        </p>
        <RadioGroup
          value={filters.status}
          onValueChange={(v) => onChange({ status: v as ExploreFilters["status"], page: 1 })}
          className="gap-2"
        >
          <label className="flex items-center gap-2 text-sm text-muted-foreground has-[[data-state=checked]]:text-foreground">
            <RadioGroupItem value="all" /> All
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground has-[[data-state=checked]]:text-foreground">
            <RadioGroupItem value="owned" /> Products Owned
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground has-[[data-state=checked]]:text-foreground">
            <RadioGroupItem value="not_owned" /> Products Not Owned
          </label>
        </RadioGroup>
      </div>
    </aside>
  );
}
