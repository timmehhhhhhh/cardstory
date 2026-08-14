"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { GAMES } from "@/lib/games/registry";
import type { ExploreFilters } from "@/app/explore/_components/types";

const WIRED_GAMES = GAMES.filter((g) => g.status === "WIRED");

export function SidebarFilters({
  filters,
  onChange,
  cardTypeOptions = [],
  rarityOptions = [],
}: {
  filters: ExploreFilters;
  onChange: (patch: Partial<ExploreFilters>) => void;
  cardTypeOptions?: string[];
  rarityOptions?: string[];
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

      <Separator />

      <div>
        <h3 className="mb-2 text-sm font-semibold">Game</h3>
        <RadioGroup
          value={filters.game}
          onValueChange={(v) => onChange({ game: v, page: 1, rarity: "all" })}
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

      {cardTypeOptions.length > 0 && (
        <>
          <Separator />

          <div>
            <h3 className="mb-2 text-sm font-semibold">Card Type</h3>
            <p className="mb-2 text-xs text-muted-foreground">
              Currently only populated for Riftbound.
            </p>
            <RadioGroup
              value={filters.cardType}
              onValueChange={(v) => onChange({ cardType: v, page: 1 })}
              className="gap-2"
            >
              <label className="flex items-center gap-2 text-sm text-muted-foreground has-[[data-state=checked]]:text-foreground">
                <RadioGroupItem value="all" /> All types
              </label>
              {cardTypeOptions.map((ct) => (
                <label
                  key={ct}
                  className="flex items-center gap-2 text-sm text-muted-foreground has-[[data-state=checked]]:text-foreground"
                >
                  <RadioGroupItem value={ct} /> {ct}
                </label>
              ))}
            </RadioGroup>
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
                  <RadioGroupItem value={r} /> {r}
                </label>
              ))}
            </RadioGroup>
          </div>
        </>
      )}

      <Separator />

      <div>
        <h3 className="mb-2 text-sm font-semibold">Product Status within Portfolio</h3>
        <p className="mb-2 text-xs text-muted-foreground">
          Filter by inventory status within your currently selected portfolio.
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
