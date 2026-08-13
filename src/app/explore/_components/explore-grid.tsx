"use client";

import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CardTile } from "@/components/cards/card-tile";
import type { CatalogSearchItem } from "@/lib/catalog/search";

export function ExploreGrid({
  items,
  view,
  isLoading,
  isError,
  page,
  pageSize,
  total,
  onPageChange,
}: {
  items: CatalogSearchItem[];
  view: "grid" | "list";
  isLoading: boolean;
  isError: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-20 text-center">
        <SearchX className="size-8 text-muted-foreground" />
        <p className="font-medium">Couldn&apos;t load the catalog</p>
        <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className={
          view === "grid"
            ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            : "flex flex-col gap-2"
        }
      >
        {Array.from({ length: view === "grid" ? 10 : 6 }).map((_, i) => (
          <Skeleton key={i} className={view === "grid" ? "aspect-[5/7] rounded-xl" : "h-16 rounded-lg"} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-20 text-center">
        <SearchX className="size-8 text-muted-foreground" />
        <p className="font-medium">No products match these filters</p>
        <p className="text-sm text-muted-foreground">Try clearing a filter or searching for something else.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className={
          view === "grid"
            ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            : "flex flex-col gap-2"
        }
      >
        {items.map((item) => (
          <CardTile key={item.id} item={item} view={view} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="size-4" /> Prev
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
