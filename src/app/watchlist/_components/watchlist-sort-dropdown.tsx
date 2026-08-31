"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WatchlistSort } from "@/lib/watchlist/selectors";

/** Same labels as Explore's SortDropdown (src/app/explore/_components/sort-dropdown.tsx) plus "Recently Added", Watchlist's own default. */
const SORT_LABELS: Record<WatchlistSort, string> = {
  recently_added: "Recently Added",
  name_asc: "Name (A–Z)",
  number_asc: "Card Number",
  domain_asc: "Domain",
  price_desc: "Price: High to Low",
  price_asc: "Price: Low to High",
  trending_up: "Trending Up",
  trending_down: "Trending Down",
  type_asc: "Card Type (A–Z)",
  release_desc: "Release Date (Newest)",
  release_asc: "Release Date (Oldest)",
};

export function WatchlistSortDropdown({
  value,
  onChange,
}: {
  value: WatchlistSort;
  onChange: (sort: WatchlistSort) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as WatchlistSort)}>
      <SelectTrigger size="sm" className="w-[180px] bg-surface border-border" aria-label="Sort watchlist by">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {Object.entries(SORT_LABELS).map(([key, label]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
