"use client";

import * as React from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { usePCStore } from "@/lib/pc/store";
import { enrichHoldings, type EnrichedHolding } from "@/lib/pc/selectors";
import { holdingIsArchived, holdingKind, pcKind, type PCKind } from "@/lib/pc/types";
import type { CatalogItemDetail } from "@/lib/catalog/by-ids";
import type { SportsCardItemDetail } from "@/lib/sportscards/manage";

/** An archived row, plus which pc it originally (still) lives in — needed for restore/permanent-delete, which are pc-scoped calls. */
export interface ArchivedRow extends EnrichedHolding {
  pcId: string;
  pcName: string;
}

/**
 * All archived holdings across every one of the user's PCs of a given kind
 * ("personal" for PC Archives, "business" for Business Archives), newest
 * archived first. Mirrors usePCData's catalog/sports enrichment, but
 * collects ids across *all* matching pcs instead of a single active one —
 * see src/hooks/use-pc-data.ts for the sibling this deliberately doesn't
 * share code with.
 */
export function useArchiveData(scopeKind: PCKind) {
  const pcs = usePCStore((s) => s.pcs);

  const holdings = React.useMemo(
    () =>
      pcs
        .filter((p) => pcKind(p) === scopeKind)
        .flatMap((p) => p.holdings.filter(holdingIsArchived).map((h) => ({ ...h, pcId: p.id, pcName: p.name }))),
    [pcs, scopeKind]
  );

  const catalogIds = React.useMemo(
    () =>
      Array.from(
        new Set(holdings.filter((h) => holdingKind(h) === "tcg" && h.catalogItemId).map((h) => h.catalogItemId!))
      ),
    [holdings]
  );
  const sportsIds = React.useMemo(
    () =>
      Array.from(
        new Set(
          holdings.filter((h) => holdingKind(h) === "sports" && h.sportsCardItemId).map((h) => h.sportsCardItemId!)
        )
      ),
    [holdings]
  );

  const catalogQuery = useQuery<{ items: CatalogItemDetail[] }>({
    queryKey: ["catalog-by-ids", catalogIds],
    queryFn: async () => {
      if (catalogIds.length === 0) return { items: [] };
      const res = await fetch(`/api/catalog/by-ids?ids=${catalogIds.join(",")}`);
      if (!res.ok) throw new Error("Failed to load catalog items");
      return res.json();
    },
    // See use-pc-data.ts's matching comment — permanently deleting the last
    // archived copy of a card shrinks `catalogIds`, which is the query key,
    // so without this the list would briefly go blank/loading and take the
    // page's scroll position with it.
    placeholderData: keepPreviousData,
  });

  const sportsQuery = useQuery<{ items: SportsCardItemDetail[] }>({
    queryKey: ["sportscards-by-ids", sportsIds],
    queryFn: async () => {
      if (sportsIds.length === 0) return { items: [] };
      const res = await fetch(`/api/sportscards/by-ids?ids=${sportsIds.join(",")}`);
      if (!res.ok) throw new Error("Failed to load sports card items");
      return res.json();
    },
    placeholderData: keepPreviousData,
  });

  const rows: ArchivedRow[] = React.useMemo(() => {
    const enriched = enrichHoldings(holdings, catalogQuery.data?.items ?? [], sportsQuery.data?.items ?? []);
    return enriched
      .map((r, i) => ({ ...r, pcId: holdings[i].pcId, pcName: holdings[i].pcName }))
      .sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? ""));
  }, [holdings, catalogQuery.data, sportsQuery.data]);

  return {
    rows,
    isLoading: (catalogQuery.isLoading && catalogIds.length > 0) || (sportsQuery.isLoading && sportsIds.length > 0),
  };
}
