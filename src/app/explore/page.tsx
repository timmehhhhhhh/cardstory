import type { Metadata } from "next";
import {
  getDistinctCardTypes,
  getDistinctRarities,
  getDistinctVariants,
  searchCatalog,
} from "@/lib/catalog/search";
import { filtersFromSearchParams } from "@/app/explore/_components/types";
import { ExploreClient } from "@/app/explore/_components/explore-client";

export const metadata: Metadata = { title: "Explore" };

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = filtersFromSearchParams(sp);

  const [initialData, cardTypeGroups, rarityOptions, variantGroups] = await Promise.all([
    searchCatalog({
      q: filters.q || undefined,
      gameId: filters.game !== "all" ? filters.game : undefined,
      setId: filters.set || undefined,
      productType: filters.type !== "all" ? filters.type : undefined,
      cardType: filters.cardType !== "all" ? filters.cardType : undefined,
      rarity: filters.rarity !== "all" ? filters.rarity : undefined,
      variant: filters.variant !== "all" ? filters.variant : undefined,
      language: filters.language !== "all" ? filters.language : undefined,
      baseOnly: filters.baseOnly,
      sort: filters.sort,
      page: filters.page,
    }),
    getDistinctCardTypes(filters.game !== "all" ? filters.game : undefined),
    getDistinctRarities(filters.game !== "all" ? filters.game : undefined),
    getDistinctVariants(filters.game !== "all" ? filters.game : undefined),
  ]);

  return (
    <ExploreClient
      initialFilters={filters}
      initialData={initialData}
      cardTypeGroups={cardTypeGroups}
      rarityOptions={rarityOptions}
      variantGroups={variantGroups}
    />
  );
}
