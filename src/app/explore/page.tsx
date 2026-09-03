import type { Metadata } from "next";
import {
  getDistinctCardTypes,
  getDistinctDomains,
  getDistinctRarities,
  getDistinctVariants,
  searchCatalog,
} from "@/lib/catalog/search";
import { filtersFromSearchParams } from "@/app/explore/_components/types";
import { ExploreClient } from "@/app/explore/_components/explore-client";
import { requireSession } from "@/lib/auth/require-session";

export const metadata: Metadata = { title: "Explore" };

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const filters = filtersFromSearchParams(sp);

  // Settings' browsing-only language/game visibility filters (see
  // visibleLanguages/hiddenGameIds on the User model) default Explore's
  // results when the user hasn't picked an explicit language/game filter of
  // their own — an explicit choice (in the URL) always wins, same
  // "explicit deep link wins" precedent ExploreClient's own sessionStorage
  // restore already follows.
  const visibleLanguages = session.user.visibleLanguages ?? [];
  const hiddenGameIds = session.user.hiddenGameIds ?? [];

  const [initialData, cardTypeGroups, rarityOptions, domainOptions, variantGroups] = await Promise.all([
    searchCatalog({
      q: filters.q || undefined,
      gameId: filters.game !== "all" ? filters.game : undefined,
      excludeGameIds: filters.game === "all" ? hiddenGameIds : undefined,
      setId: filters.set || undefined,
      productType: filters.type !== "all" ? filters.type : undefined,
      cardType: filters.cardType !== "all" ? filters.cardType : undefined,
      rarity: filters.rarity !== "all" ? filters.rarity : undefined,
      domain: filters.domain !== "all" ? filters.domain : undefined,
      variant: filters.variant !== "all" ? filters.variant : undefined,
      artist: filters.artist || undefined,
      language: filters.language !== "all" ? filters.language : visibleLanguages.length > 0 ? visibleLanguages : undefined,
      baseOnly: filters.baseOnly,
      sort: filters.sort,
      page: filters.page,
      randomFeedUserId: session.user.id,
    }),
    getDistinctCardTypes(filters.game !== "all" ? filters.game : undefined),
    getDistinctRarities(filters.game !== "all" ? filters.game : undefined),
    getDistinctDomains(filters.game !== "all" ? filters.game : undefined),
    getDistinctVariants(filters.game !== "all" ? filters.game : undefined),
  ]);

  return (
    <ExploreClient
      initialFilters={filters}
      initialData={initialData}
      cardTypeGroups={cardTypeGroups}
      rarityOptions={rarityOptions}
      domainOptions={domainOptions}
      variantGroups={variantGroups}
    />
  );
}
