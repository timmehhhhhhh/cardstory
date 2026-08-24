"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownAZ, ArrowDownNarrowWide, ArrowUpAZ, ArrowUpNarrowWide, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SetSortField = "date" | "name";
export type SetSortDirection = "asc" | "desc";

const FIELD_OPTIONS: { value: SetSortField; label: string }[] = [
  { value: "date", label: "Release Date" },
  { value: "name", label: "Set Name" },
];

/**
 * Sort field + direction + "group by language" controls for a game's Sets
 * list. Replaces the old binary SortToggle (newest/oldest only) now that
 * there's a second sortable field and an independent grouping toggle. All
 * three drive plain `?sortBy=&sort=&group=` URL params that GameSetsPage
 * reads server-side to pick the Prisma orderBy/grouping (see that file) —
 * same "URL is the source of truth" convention as Explore's filters and
 * PC's SortBySelect (app/pc/_components/sort-by.tsx), just spread across
 * three params instead of one client-state object since each choice is
 * independently shareable/bookmarkable.
 */
export function SortControls() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sortBy: SetSortField = searchParams.get("sortBy") === "name" ? "name" : "date";
  const direction: SetSortDirection = searchParams.get("sort") === "asc" ? "asc" : "desc";
  const grouped = searchParams.get("group") === "language";

  function update(next: { sortBy?: SetSortField; sort?: SetSortDirection; group?: boolean }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.sortBy !== undefined) {
      // Default — omit from the URL so it stays clean.
      if (next.sortBy === "date") params.delete("sortBy");
      else params.set("sortBy", next.sortBy);
    }
    if (next.sort !== undefined) {
      if (next.sort === "desc") params.delete("sort");
      else params.set("sort", next.sort);
    }
    if (next.group !== undefined) {
      if (!next.group) params.delete("group");
      else params.set("group", "language");
    }
    const query = params.toString();
    router.push(query ? `?${query}` : "?", { scroll: false });
  }

  const directionLabel =
    sortBy === "date"
      ? direction === "asc"
        ? "Oldest"
        : "Newest"
      : direction === "asc"
        ? "A → Z"
        : "Z → A";
  const DirectionIcon =
    sortBy === "date"
      ? direction === "asc"
        ? ArrowUpNarrowWide
        : ArrowDownNarrowWide
      : direction === "asc"
        ? ArrowDownAZ
        : ArrowUpAZ;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={sortBy} onValueChange={(v) => update({ sortBy: v as SetSortField })}>
        <SelectTrigger size="sm" className="w-[9.5rem] border-border bg-surface" aria-label="Sort sets by">
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
        onClick={() => update({ sort: direction === "asc" ? "desc" : "asc" })}
        aria-label={`Sort direction: ${directionLabel}`}
        title={`Sort direction: ${directionLabel} — click to flip`}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
      >
        <DirectionIcon className="size-4" /> {directionLabel}
      </button>
      <button
        type="button"
        aria-pressed={grouped}
        onClick={() => update({ group: !grouped })}
        title="Group sets by language"
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm",
          grouped
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border bg-surface text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
        )}
      >
        <Languages className="size-4" /> Group by Language
      </button>
    </div>
  );
}
