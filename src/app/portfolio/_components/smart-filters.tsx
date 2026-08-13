"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GAMES } from "@/lib/games/registry";
import type { HoldingFilters } from "@/app/portfolio/_components/types";

const WIRED_GAMES = GAMES.filter((g) => g.status === "WIRED");

export function SmartFilters({
  filters,
  onChange,
}: {
  filters: HoldingFilters;
  onChange: (patch: Partial<HoldingFilters>) => void;
}) {
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
