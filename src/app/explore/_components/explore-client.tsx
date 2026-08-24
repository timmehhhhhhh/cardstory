"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import { SidebarFilters } from "@/app/explore/_components/sidebar-filters";
import { SortDropdown } from "@/app/explore/_components/sort-dropdown";
import { ViewToggle } from "@/app/explore/_components/view-toggle";
import { BusinessModeToggle } from "@/app/explore/_components/business-mode-toggle";
import { QuickAddToggle } from "@/app/explore/_components/quick-add-toggle";
import { SaveAsViewButton } from "@/app/explore/_components/save-as-view-button";
import { ExploreGrid } from "@/app/explore/_components/explore-grid";
import { filtersToSearchParams, type ExploreFilters } from "@/app/explore/_components/types";
import { usePCStore } from "@/lib/pc/store";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { CardTypeGroup, CatalogSearchItem, VariantGroup } from "@/lib/catalog/search";
import type { Holding } from "@/lib/pc/types";

const EMPTY_HOLDINGS: Holding[] = [];

// Explore's search/filters state is normally seeded from the URL, but the
// top-nav "Explore" link is a plain `/explore` href with no query string, and
// this route has no shared layout — so navigating away and back fully
// unmounts ExploreClient and resets everything. Session-storing the last
// query string lets a bare landing restore it instead of defaulting.
const LAST_QUERY_STORAGE_KEY = "cardstory:explore:last-query";

interface SearchResponse {
  items: CatalogSearchItem[];
  total: number;
  page: number;
  pageSize: number;
}

export function ExploreClient({
  initialFilters,
  initialData,
  cardTypeGroups,
  rarityOptions,
  domainOptions,
  variantGroups,
}: {
  initialFilters: ExploreFilters;
  initialData: SearchResponse;
  cardTypeGroups: CardTypeGroup[];
  rarityOptions: string[];
  domainOptions: string[];
  variantGroups: VariantGroup[];
}) {
  const router = useRouter();
  const { data: session } = useSession();
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

  // Restore the last session's search/filters when landing on a bare
  // `/explore` (no query string at all) — the exact case the top-nav link
  // produces. A URL that already carries params is an intentional deep link
  // (e.g. from /sets or the search box) and must win over any saved session.
  const restoredRef = React.useRef(false);
  React.useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (window.location.search) return;
    let saved: string | null = null;
    try {
      saved = window.sessionStorage.getItem(LAST_QUERY_STORAGE_KEY);
    } catch {
      return;
    }
    if (saved) {
      router.replace(`/explore?${saved}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rarityQuery = useQuery<string[]>({
    queryKey: ["catalog-rarities", filters.game],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (filters.game !== "all") sp.set("game", filters.game);
      const res = await fetch(`/api/catalog/rarities?${sp.toString()}`);
      if (!res.ok) throw new Error("Failed to load rarities");
      const json = (await res.json()) as { rarities: string[] };
      return json.rarities;
    },
    initialData: filters.game === initialFilters.game ? rarityOptions : undefined,
    placeholderData: (prev) => prev,
  });
  const resolvedRarityOptions = rarityQuery.data ?? rarityOptions;

  const domainQuery = useQuery<string[]>({
    queryKey: ["catalog-domains", filters.game],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (filters.game !== "all") sp.set("game", filters.game);
      const res = await fetch(`/api/catalog/domains?${sp.toString()}`);
      if (!res.ok) throw new Error("Failed to load domains");
      const json = (await res.json()) as { domains: string[] };
      return json.domains;
    },
    initialData: filters.game === initialFilters.game ? domainOptions : undefined,
    placeholderData: (prev) => prev,
  });
  const resolvedDomainOptions = domainQuery.data ?? domainOptions;

  const cardTypeQuery = useQuery<CardTypeGroup[]>({
    queryKey: ["catalog-card-types", filters.game],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (filters.game !== "all") sp.set("game", filters.game);
      const res = await fetch(`/api/catalog/card-types?${sp.toString()}`);
      if (!res.ok) throw new Error("Failed to load card types");
      const json = (await res.json()) as { cardTypeGroups: CardTypeGroup[] };
      return json.cardTypeGroups;
    },
    initialData: filters.game === initialFilters.game ? cardTypeGroups : undefined,
    placeholderData: (prev) => prev,
  });
  const resolvedCardTypeGroups = cardTypeQuery.data ?? cardTypeGroups;

  const variantQuery = useQuery<VariantGroup[]>({
    queryKey: ["catalog-variants", filters.game],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (filters.game !== "all") sp.set("game", filters.game);
      const res = await fetch(`/api/catalog/variants?${sp.toString()}`);
      if (!res.ok) throw new Error("Failed to load variants");
      const json = (await res.json()) as { variantGroups: VariantGroup[] };
      return json.variantGroups;
    },
    initialData: filters.game === initialFilters.game ? variantGroups : undefined,
    placeholderData: (prev) => prev,
  });
  const resolvedVariantGroups = variantQuery.data ?? variantGroups;

  const holdings = usePCStore(
    (s) => s.pcs.find((p) => p.id === s.activePCId)?.holdings ?? EMPTY_HOLDINGS
  );
  const watchlist = usePCStore((s) => s.watchlist);
  const watchlistIds = React.useMemo(() => watchlist.map((w) => w.itemId), [watchlist]);
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
    try {
      window.sessionStorage.setItem(LAST_QUERY_STORAGE_KEY, qs);
    } catch {
      // Storage disabled (private browsing, etc.) — restore-on-return just
      // won't work; navigation itself must never be affected.
    }
  }

  const isDefaultQuery =
    filters.q === initialFilters.q &&
    filters.game === initialFilters.game &&
    filters.type === initialFilters.type &&
    filters.cardType === initialFilters.cardType &&
    filters.rarity === initialFilters.rarity &&
    filters.domain === initialFilters.domain &&
    filters.variant === initialFilters.variant &&
    filters.language === initialFilters.language &&
    filters.baseOnly === initialFilters.baseOnly &&
    filters.status === initialFilters.status &&
    filters.watchlistOnly === initialFilters.watchlistOnly &&
    filters.sort === initialFilters.sort &&
    filters.page === initialFilters.page &&
    filters.status === "all" &&
    !filters.watchlistOnly;

  // Only fold ownedIds/watchlistIds into the cache key when the current
  // filters actually depend on them — otherwise every PC/watchlist change
  // (e.g. adding a holding from a different page) would invalidate and
  // refetch catalog search results that don't reference ownership at all.
  const ownershipKey =
    filters.status === "owned" || filters.status === "not_owned"
      ? ownedIds
      : filters.watchlistOnly
        ? watchlistIds
        : undefined;

  const query = useQuery<SearchResponse>({
    queryKey: ["catalog-search", filters, ownershipKey],
    queryFn: async () => {
      const sp = filtersToSearchParams(filters);
      sp.set("page", String(filters.page));
      if (filters.status === "owned") sp.set("onlyIds", ownedIds.join(","));
      if (filters.status === "not_owned") sp.set("excludeIds", ownedIds.join(","));
      if (filters.watchlistOnly) sp.set("onlyIds", watchlistIds.join(","));
      const res = await fetch(`/api/catalog/search?${sp.toString()}`);
      if (!res.ok) throw new Error("Failed to load catalog");
      return (await res.json()) as SearchResponse;
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
          cardTypeGroups={resolvedCardTypeGroups}
          rarityOptions={resolvedRarityOptions}
          domainOptions={resolvedDomainOptions}
          variantGroups={resolvedVariantGroups}
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
                    cardTypeGroups={resolvedCardTypeGroups}
                    rarityOptions={resolvedRarityOptions}
                    variantGroups={resolvedVariantGroups}
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
            <BusinessModeToggle />
            <QuickAddToggle />
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {data.total.toLocaleString()} results
            </span>
            {session?.user && <SaveAsViewButton filters={filters} />}
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
