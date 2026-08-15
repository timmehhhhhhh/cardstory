"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import { SidebarFilters } from "@/app/explore/_components/sidebar-filters";
import { SortDropdown } from "@/app/explore/_components/sort-dropdown";
import { ViewToggle } from "@/app/explore/_components/view-toggle";
import { ExploreGrid } from "@/app/explore/_components/explore-grid";
import { filtersToSearchParams, type ExploreFilters } from "@/app/explore/_components/types";
import { usePortfolioStore } from "@/lib/portfolio/store";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { CatalogSearchItem } from "@/lib/catalog/search";
import type { Holding } from "@/lib/portfolio/types";

const EMPTY_HOLDINGS: Holding[] = [];

interface SearchResponse {
  items: CatalogSearchItem[];
  total: number;
  page: number;
  pageSize: number;
}

export function ExploreClient({
  initialFilters,
  initialData,
  cardTypeOptions,
  rarityOptions,
}: {
  initialFilters: ExploreFilters;
  initialData: SearchResponse;
  cardTypeOptions: string[];
  rarityOptions: string[];
}) {
  const router = useRouter();
  const [filters, setFilters] = React.useState(initialFilters);
  // Resync when initialFilters changes from outside our own updateFilters
  // calls — e.g. the top-nav SearchBox or a /sets deep link doing a real
  // navigation to a new /explore URL, or browser back/forward. Next.js
  // reruns page.tsx and hands us a fresh initialFilters prop, but this
  // component instance isn't remounted, so useState above only seeds once.
  // Adjusted during render per https://react.dev/learn/you-might-not-need-an-effect,
  // same pattern as sidebar-filters.tsx's qDraft sync.
  const initialFiltersKey = filtersToSearchParams(initialFilters).toString();
  const [prevInitialFiltersKey, setPrevInitialFiltersKey] = React.useState(initialFiltersKey);
  if (initialFiltersKey !== prevInitialFiltersKey) {
    setPrevInitialFiltersKey(initialFiltersKey);
    setFilters(initialFilters);
  }

  const rarityQuery = useQuery<string[]>({
    queryKey: ["catalog-rarities", filters.game],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (filters.game !== "all") sp.set("game", filters.game);
      const res = await fetch(`/api/catalog/rarities?${sp.toString()}`);
      if (!res.ok) throw new Error("Failed to load rarities");
      const json = await res.json();
      return json.rarities as string[];
    },
    initialData: filters.game === initialFilters.game ? rarityOptions : undefined,
    placeholderData: (prev) => prev,
  });
  const resolvedRarityOptions = rarityQuery.data ?? rarityOptions;

  const holdings = usePortfolioStore(
    (s) => s.portfolios.find((p) => p.id === s.activePortfolioId)?.holdings ?? EMPTY_HOLDINGS
  );
  const watchlist = usePortfolioStore((s) => s.watchlist);
  const ownedIds = React.useMemo(
    () =>
      Array.from(
        new Set(
          holdings
            .map((h) => h.catalogItemId ?? h.sportsCardItemId)
            .filter((id): id is string => Boolean(id))
        )
      ),
    [holdings]
  );

  function updateFilters(patch: Partial<ExploreFilters>) {
    const next = { ...filters, ...patch };
    setFilters(next);
    const sp = filtersToSearchParams(next);
    const qs = sp.toString();
    router.replace(qs ? `/explore?${qs}` : "/explore", { scroll: false });
  }

  const isDefaultQuery =
    filters.q === initialFilters.q &&
    filters.game === initialFilters.game &&
    filters.type === initialFilters.type &&
    filters.cardType === initialFilters.cardType &&
    filters.rarity === initialFilters.rarity &&
    filters.baseOnly === initialFilters.baseOnly &&
    filters.status === initialFilters.status &&
    filters.watchlistOnly === initialFilters.watchlistOnly &&
    filters.sort === initialFilters.sort &&
    filters.page === initialFilters.page &&
    filters.status === "all" &&
    !filters.watchlistOnly;

  const query = useQuery<SearchResponse>({
    queryKey: ["catalog-search", filters, ownedIds, watchlist],
    queryFn: async () => {
      const sp = filtersToSearchParams(filters);
      sp.set("page", String(filters.page));
      if (filters.status === "owned") sp.set("onlyIds", ownedIds.join(","));
      if (filters.status === "not_owned") sp.set("excludeIds", ownedIds.join(","));
      if (filters.watchlistOnly) sp.set("onlyIds", watchlist.join(","));
      const res = await fetch(`/api/catalog/search?${sp.toString()}`);
      if (!res.ok) throw new Error("Failed to load catalog");
      return res.json();
    },
    initialData: isDefaultQuery ? initialData : undefined,
    placeholderData: (prev) => prev,
  });

  const data = query.data ?? initialData;
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row">
      <div className="hidden lg:block">
        <SidebarFilters
          filters={filters}
          onChange={updateFilters}
          cardTypeOptions={cardTypeOptions}
          rarityOptions={resolvedRarityOptions}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Find a Product</h1>
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <SlidersHorizontal className="size-3.5" /> Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto bg-background border-border">
                <SheetTitle className="px-4 pt-4">Filters</SheetTitle>
                <div className="px-4 pb-6">
                  <SidebarFilters
                    filters={filters}
                    onChange={updateFilters}
                    cardTypeOptions={cardTypeOptions}
                    rarityOptions={resolvedRarityOptions}
                  />
                </div>
              </SheetContent>
            </Sheet>
            {filters.set && (
              <button
                type="button"
                onClick={() => updateFilters({ set: "", page: 1 })}
                className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20"
              >
                Set filter active <span aria-hidden>×</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {data.total.toLocaleString()} results
            </span>
            <SortDropdown value={filters.sort} onChange={(sort) => updateFilters({ sort, page: 1 })} />
            <ViewToggle value={filters.view} onChange={(view) => updateFilters({ view })} />
          </div>
        </div>

        <ExploreGrid
          items={data.items}
          view={filters.view}
          isLoading={query.isLoading}
          isError={query.isError}
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          onPageChange={(page) => updateFilters({ page })}
        />
      </div>
    </div>
  );
}
