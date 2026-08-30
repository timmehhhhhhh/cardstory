"use client";

import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SortDirection, SortField } from "@/lib/pc/types";

const FIELD_OPTIONS: { value: SortField; label: string }[] = [
  { value: "dateAdded", label: "Date Added" },
  { value: "dateAcquired", label: "Date Acquired" },
  { value: "name", label: "Card Name" },
  { value: "setName", label: "Set Name" },
  { value: "value", label: "Value" },
  { value: "releaseDate", label: "Release Date" },
];

/**
 * Field + direction sort control for the PC List/Gallery. Lives inside
 * QuickActions' sticky group alongside the Bulk Actions toggle so both stay
 * reachable while scrolling a long collection — see quick-actions.tsx.
 */
export function SortBySelect({
  field,
  direction,
  onFieldChange,
  onDirectionChange,
}: {
  field: SortField;
  direction: SortDirection;
  onFieldChange: (field: SortField) => void;
  onDirectionChange: (direction: SortDirection) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Select value={field} onValueChange={(v) => onFieldChange(v as SortField)}>
        <SelectTrigger size="sm" className="w-36 bg-surface border-border" aria-label="Sort by">
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
      <button
        type="button"
        onClick={() => onDirectionChange(direction === "asc" ? "desc" : "asc")}
        aria-label={direction === "asc" ? "Sort ascending" : "Sort descending"}
        title={direction === "asc" ? "Ascending — click for descending" : "Descending — click for ascending"}
        className="flex items-center justify-center rounded-lg border border-border bg-surface p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
      >
        {direction === "asc" ? (
          <ArrowUpNarrowWide className="size-4" />
        ) : (
          <ArrowDownWideNarrow className="size-4" />
        )}
      </button>
    </div>
  );
}
