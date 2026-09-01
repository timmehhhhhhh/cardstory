"use client";

import { useQuery } from "@tanstack/react-query";
import type { CatalogItemDetail } from "@/lib/catalog/by-ids";

/**
 * Batch-resolves the catalog items behind a binder's "not owned" pockets
 * (kind: "catalog" — see src/lib/binder/types.ts) into display data, via the
 * same `/api/catalog/by-ids` route deck-crafting uses to resolve its own
 * catalogItemId references. This is the one place Binder makes a network
 * call — every other pocket (kind: "holding") resolves entirely from the
 * local pc, no fetch involved.
 */
export function useBinderCatalogItems(catalogItemIds: string[]) {
  const ids = [...new Set(catalogItemIds)].sort();

  const query = useQuery<{ items: CatalogItemDetail[] }>({
    queryKey: ["binder-catalog-items", ids],
    queryFn: async () => {
      const res = await fetch(`/api/catalog/by-ids?ids=${ids.join(",")}`);
      if (!res.ok) throw new Error("Failed to load catalog items");
      return (await res.json()) as { items: CatalogItemDetail[] };
    },
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const itemsById = new Map((query.data?.items ?? []).map((item) => [item.id, item]));
  return { itemsById, isLoading: ids.length > 0 && query.isLoading };
}
