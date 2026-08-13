import type { Metadata } from "next";
import { searchCatalog } from "@/lib/catalog/search";
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

  const initialData = await searchCatalog({
    q: filters.q || undefined,
    gameId: filters.game !== "all" ? filters.game : undefined,
    setId: filters.set || undefined,
    productType: filters.type !== "all" ? filters.type : undefined,
    sort: filters.sort,
    page: filters.page,
  });

  return <ExploreClient initialFilters={filters} initialData={initialData} />;
}
