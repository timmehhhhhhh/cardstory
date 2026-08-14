"use client";

import * as React from "react";
import { Search, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GAMES } from "@/lib/games/registry";
import { SPORTS } from "@/lib/sports/registry";
import type { HoldingFilters } from "@/app/portfolio/_components/types";

const WIRED_GAMES = GAMES.filter((g) => g.status === "WIRED");

export function SmartFilters({
  filters,
  onChange,
}: {
  filters: HoldingFilters;
  onChange: (patch: Partial<HoldingFilters>) => void;
}) {
  const [playerDraft, setPlayerDraft] = React.useState(filters.player);
  // Reset the draft when filters.player changes from outside this component
  // — adjusted during render (not in an effect) per
  // https://react.dev/learn/you-might-not-need-an-effect.
  const [prevPlayer, setPrevPlayer] = React.useState(filters.player);
  if (filters.player !== prevPlayer) {
    setPrevPlayer(filters.player);
    setPlayerDraft(filters.player);
  }

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (playerDraft !== filters.player) onChange({ player: playerDraft });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerDraft]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onChange({ watchlistOnly: !filters.watchlistOnly })}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm",
          filters.watchlistOnly
            ? "border-watchlist/40 bg-watchlist/10 text-watchlist"
            : "border-border bg-surface text-muted-foreground hover:text-foreground"
        )}
      >
        <Star className={cn("size-3.5", filters.watchlistOnly && "fill-watchlist")} /> Watchlist
      </button>

      <Select value={filters.gameId} onValueChange={(v) => onChange({ gameId: v })}>
        <SelectTrigger size="sm" className="w-32 bg-surface border-border">
          <SelectValue placeholder="Game" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All games</SelectItem>
          {WIRED_GAMES.map((g) => (
            <SelectItem key={g.id} value={g.id}>
              {g.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.sport} onValueChange={(v) => onChange({ sport: v })}>
        <SelectTrigger size="sm" className="w-32 bg-surface border-border">
          <SelectValue placeholder="Sport" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sports</SelectItem>
          {SPORTS.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={playerDraft}
          onChange={(e) => setPlayerDraft(e.target.value)}
          placeholder="Player"
          className="h-8 w-36 bg-surface border-border pl-7 pr-7 text-sm"
        />
        {playerDraft && (
          <button
            type="button"
            aria-label="Clear player filter"
            onClick={() => {
              setPlayerDraft("");
              onChange({ player: "" });
            }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <Select
        value={filters.productType}
        onValueChange={(v) => onChange({ productType: v as HoldingFilters["productType"] })}
      >
        <SelectTrigger size="sm" className="w-32 bg-surface border-border">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Cards or sealed</SelectItem>
          <SelectItem value="CARD">Cards</SelectItem>
          <SelectItem value="SEALED">Sealed</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.condition}
        onValueChange={(v) => onChange({ condition: v as HoldingFilters["condition"] })}
      >
        <SelectTrigger size="sm" className="w-32 bg-surface border-border">
          <SelectValue placeholder="Condition" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Graded or raw</SelectItem>
          <SelectItem value="raw">Raw</SelectItem>
          <SelectItem value="graded">Graded</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.language}
        onValueChange={(v) => onChange({ language: v as HoldingFilters["language"] })}
      >
        <SelectTrigger size="sm" className="w-28 bg-surface border-border">
          <SelectValue placeholder="Language" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Language</SelectItem>
          <SelectItem value="EN">English</SelectItem>
          <SelectItem value="JP">Japanese</SelectItem>
          <SelectItem value="CN">Chinese</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
