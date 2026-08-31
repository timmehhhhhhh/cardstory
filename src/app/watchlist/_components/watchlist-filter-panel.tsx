"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { RIFTBOUND_RARITY_LABEL } from "@/lib/games/riftbound/rarity";
import { DomainIcon } from "@/components/cards/riftbound-icons";
import { languageLabel } from "@/lib/format/language";
import type { WatchlistFacets, WatchlistFilters } from "@/lib/watchlist/selectors";

/**
 * The rest of Watchlist's filters — Game/Product Type/Card Type/Variation/
 * Rarity/Domain/Artist/Language — same field set as Explore's SidebarFilters
 * (src/app/explore/_components/sidebar-filters.tsx), same widget choices
 * (RadioGroup for short lists, Select for longer per-game ones), just
 * sourced from `facets` (computeWatchlistFacets over the loaded rows)
 * instead of a DB facet query, and rendered inside watchlist-toolbar.tsx's
 * Sheet rather than a persistent desktop sidebar.
 */
export function WatchlistFilterPanel({
  filters,
  onChange,
  facets,
}: {
  filters: WatchlistFilters;
  onChange: (patch: Partial<WatchlistFilters>) => void;
  facets: WatchlistFacets;
}) {
  const [artistDraft, setArtistDraft] = React.useState(filters.artist);
  const [prevArtist, setPrevArtist] = React.useState(filters.artist);
  if (filters.artist !== prevArtist) {
    setPrevArtist(filters.artist);
    setArtistDraft(filters.artist);
  }
  React.useEffect(() => {
    const t = setTimeout(() => {
      if (artistDraft !== filters.artist) onChange({ artist: artistDraft });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistDraft]);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-2 text-sm font-semibold">Game</h3>
        <RadioGroup
          value={filters.gameId ?? "all"}
          onValueChange={(v) =>
            onChange({
              gameId: v === "all" ? null : v,
              cardType: null,
              variantKey: null,
              rarity: null,
              domain: null,
              artist: "",
            })
          }
          className="gap-2"
        >
          <label className="flex items-center gap-2 text-sm text-muted-foreground has-[[data-state=checked]]:text-foreground">
            <RadioGroupItem value="all" /> All games
          </label>
          {facets.games.map((g) => (
            <label
              key={g.id}
              className="flex items-center gap-2 text-sm text-muted-foreground has-[[data-state=checked]]:text-foreground"
            >
              <RadioGroupItem value={g.id} /> {g.label}
            </label>
          ))}
        </RadioGroup>
      </div>

      {facets.hasSealed && (
        <>
          <Separator />
          <div>
            <h3 className="mb-2 text-sm font-semibold">Product Type</h3>
            <RadioGroup
              value={filters.productType ?? "all"}
              onValueChange={(v) =>
                onChange({ productType: v === "all" ? null : (v as "CARD" | "SEALED") })
              }
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
        </>
      )}

      {facets.cardTypes.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="mb-2 text-sm font-semibold">Card Type</h3>
            <Select
              value={filters.cardType ?? "all"}
              onValueChange={(v) => onChange({ cardType: v === "all" ? null : v })}
            >
              <SelectTrigger className="w-full bg-surface border-border">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {facets.cardTypes.map((ct) => (
                  <SelectItem key={ct} value={ct}>
                    {ct}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {facets.variants.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="mb-2 text-sm font-semibold">Variation</h3>
            <Select
              value={filters.variantKey ?? "all"}
              onValueChange={(v) => onChange({ variantKey: v === "all" ? null : v })}
            >
              <SelectTrigger className="w-full bg-surface border-border">
                <SelectValue placeholder="All variations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All variations</SelectItem>
                {facets.variants.map((v) => (
                  <SelectItem key={v.key} value={v.key}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {facets.rarities.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="mb-2 text-sm font-semibold">Rarity</h3>
            <RadioGroup
              value={filters.rarity ?? "all"}
              onValueChange={(v) => onChange({ rarity: v === "all" ? null : v })}
              className="gap-2 max-h-64 overflow-y-auto pr-1"
            >
              <label className="flex items-center gap-2 text-sm text-muted-foreground has-[[data-state=checked]]:text-foreground">
                <RadioGroupItem value="all" /> All rarities
              </label>
              {facets.rarities.map((r) => (
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

      {facets.domains.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="mb-2 text-sm font-semibold">Domain</h3>
            <RadioGroup
              value={filters.domain ?? "all"}
              onValueChange={(v) => onChange({ domain: v === "all" ? null : v })}
              className="gap-2 max-h-64 overflow-y-auto pr-1"
            >
              <label className="flex items-center gap-2 text-sm text-muted-foreground has-[[data-state=checked]]:text-foreground">
                <RadioGroupItem value="all" /> All domains
              </label>
              {facets.domains.map((d) => (
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
        <h3 className="mb-2 text-sm font-semibold">Artist</h3>
        <div className="relative">
          <Input
            value={artistDraft}
            onChange={(e) => setArtistDraft(e.target.value)}
            placeholder="e.g. Mitsuhiro Arita"
            className="bg-surface border-border pr-8"
          />
          {artistDraft && (
            <button
              type="button"
              aria-label="Clear artist"
              onClick={() => {
                setArtistDraft("");
                onChange({ artist: "" });
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {facets.languages.length > 1 && (
        <>
          <Separator />
          <div>
            <h3 className="mb-2 text-sm font-semibold">Language</h3>
            <RadioGroup
              value={filters.language ?? "all"}
              onValueChange={(v) => onChange({ language: v === "all" ? null : v })}
              className="gap-2"
            >
              <label className="flex items-center gap-2 text-sm text-muted-foreground has-[[data-state=checked]]:text-foreground">
                <RadioGroupItem value="all" /> All languages
              </label>
              {facets.languages.map((l) => (
                <label
                  key={l}
                  className="flex items-center gap-2 text-sm text-muted-foreground has-[[data-state=checked]]:text-foreground"
                >
                  <RadioGroupItem value={l} /> {languageLabel(l)}
                </label>
              ))}
            </RadioGroup>
          </div>
        </>
      )}
    </div>
  );
}
