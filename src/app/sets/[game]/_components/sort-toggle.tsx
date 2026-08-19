"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownNarrowWide, ArrowUpNarrowWide } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Flips the Sets list between newest-first (default, matches the historic
 * hard-coded order) and oldest-first. Drives a `?sort=asc|desc` URL param
 * that GameSetsPage reads server-side to pick the Prisma orderBy direction —
 * same "URL is the source of truth" convention as Explore's filters, just a
 * plain search param instead of a client-state object since this is a
 * single binary choice, not a pick-one-of-many-fields sort (contrast with
 * app/explore/_components/sort-dropdown.tsx).
 */
export function SortToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sort = searchParams.get("sort") === "asc" ? "asc" : "desc";

  function setSort(next: "asc" | "desc") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "desc") {
      // Default — omit from the URL so it stays clean.
      params.delete("sort");
    } else {
      params.set("sort", next);
    }
    const query = params.toString();
    router.push(query ? `?${query}` : "?", { scroll: false });
  }

  const options: { value: "desc" | "asc"; label: string; icon: typeof ArrowDownNarrowWide }[] = [
    { value: "desc", label: "Newest", icon: ArrowDownNarrowWide },
    { value: "asc", label: "Oldest", icon: ArrowUpNarrowWide },
  ];

  return (
    <div
      role="group"
      aria-label="Sort by release date"
      className="flex items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={sort === o.value}
          onClick={() => setSort(o.value)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm",
            sort === o.value
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
          )}
        >
          <o.icon className="size-4" /> {o.label}
        </button>
      ))}
    </div>
  );
}
