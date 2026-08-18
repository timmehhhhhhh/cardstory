"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ExploreGrid } from "@/app/explore/_components/explore-grid";
import { viewFiltersToSearchParams } from "@/lib/views/filters";
import type { SavedView } from "@/lib/views/types";
import type { CatalogSearchItem } from "@/lib/catalog/search";

interface SearchResponse {
  items: CatalogSearchItem[];
  total: number;
  page: number;
  pageSize: number;
}

const EMPTY: SearchResponse = { items: [], total: 0, page: 1, pageSize: 24 };

export function ViewResults({ view }: { view: SavedView }) {
  const [page, setPage] = React.useState(1);
  // Reset to page 1 whenever the selected View changes — adjusted during
  // render per https://react.dev/learn/you-might-not-need-an-effect, same
  // idiom used throughout explore-client.tsx, not a useEffect.
  const [prevViewId, setPrevViewId] = React.useState(view.id);
  if (view.id !== prevViewId) {
    setPrevViewId(view.id);
    setPage(1);
  }

  const query = useQuery<SearchResponse>({
    queryKey: ["view-search", view.id, view.filters, page],
    queryFn: async () => {
      const sp = viewFiltersToSearchParams(view.filters);
      sp.set("page", String(page));
      const res = await fetch(`/api/catalog/search?${sp.toString()}`);
      if (!res.ok) throw new Error("Failed to load catalog");
      return res.json();
    },
    placeholderData: (prev) => prev,
  });

  const data = query.data ?? EMPTY;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{data.total.toLocaleString()} results</p>
      <ExploreGrid
        items={data.items}
        view="grid"
        isLoading={query.isLoading}
        isError={query.isError}
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        onPageChange={setPage}
      />
    </div>
  );
}
