import type { Metadata } from "next";
import { getDistinctCardTypes, getDistinctRarities, searchCatalog } from "@/lib/catalog/search";
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

  const [initialData, cardTypeOptions, rarityOptions] = await Promise.all([
    searchCatalog({
      q: filters.q || undefined,
      gameId: filters.game !== "all" ? filters.game : undefined,
      setId: filters.set || undefined,
      productType: filters.type !== "all" ? filters.type : undefined,
      cardType: filters.cardType !== "all" ? filters.cardType : undefined,
      rarity: filters.rarity !== "all" ? filters.rarity : undefined,
      baseOnly: filters.baseOnly,
      sort: filters.sort,
      page: filters.page,
    }),
    getDistinctCardTypes(),
    getDistinctRarities(filters.game !== "all" ? filters.game : undefined),
  ]);

  return (
    <ExploreClient
      initialFilters={filters}
      initialData={initialData}
      cardTypeOptions={cardTypeOptions}
      rarityOptions={rarityOptions}
    />
  );
}
