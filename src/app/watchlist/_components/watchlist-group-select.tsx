"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WatchlistGroupField } from "@/lib/watchlist/selectors";

const FIELD_OPTIONS: { value: WatchlistGroupField; label: string }[] = [
  { value: "none", label: "No Grouping" },
  { value: "set", label: "Set" },
  { value: "language", label: "Language" },
  { value: "game", label: "Game" },
  { value: "rarity", label: "Rarity" },
];

/**
 * User-selectable grouping for the Watchlist list — same widget/pattern as
 * the PC page's GroupBySelect (src/app/pc/_components/group-by.tsx), picked
 * over a fixed grouping since Watchlist can hold cards from any game with
 * very different natural groupings (Set makes sense for a Pokémon-heavy
 * watchlist, Language/Rarity for others). Orthogonal to WatchlistSortDropdown,
 * which decides row order both overall and within each group.
 */
export function WatchlistGroupSelect({
  field,
  onFieldChange,
}: {
  field: WatchlistGroupField;
  onFieldChange: (field: WatchlistGroupField) => void;
}) {
  return (
    <Select value={field} onValueChange={(v) => onFieldChange(v as WatchlistGroupField)}>
      <SelectTrigger size="sm" className="w-40 bg-surface border-border" aria-label="Group watchlist by">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {FIELD_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
