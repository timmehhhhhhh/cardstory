"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CatalogSort } from "@/lib/catalog/search";

const SORT_LABELS: Record<CatalogSort, string> = {
  best_match: "Best Match",
  name_asc: "Name (A–Z)",
  number_asc: "Card Number",
  price_desc: "Price: High to Low",
  price_asc: "Price: Low to High",
  trending_up: "Trending Up",
  trending_down: "Trending Down",
  type_asc: "Card Type (A–Z)",
  release_desc: "Release Date (Newest)",
  release_asc: "Release Date (Oldest)",
};

export function SortDropdown({
  value,
  onChange,
}: {
  value: CatalogSort;
  onChange: (sort: CatalogSort) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as CatalogSort)}>
      <SelectTrigger size="sm" className="w-[180px] bg-surface border-border">
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
