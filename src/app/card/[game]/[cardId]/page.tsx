import { cache } from "react";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getGameMeta } from "@/lib/games/registry";
import { CardBreadcrumb } from "@/app/card/[game]/[cardId]/_components/breadcrumb";
import { withEnglishName } from "@/lib/catalog/card-name";
import { PriceHistoryPanel } from "@/app/card/[game]/[cardId]/_components/price-history-panel";
import { CollectionPanel } from "@/app/card/[game]/[cardId]/_components/collection-panel";
import { ShortlistPanel } from "@/app/card/[game]/[cardId]/_components/shortlist-panel";
import { BusinessHoldingsPanel } from "@/app/card/[game]/[cardId]/_components/business-holdings-panel";
import { ShopPanel } from "@/app/card/[game]/[cardId]/_components/shop-panel";
import { GradedPricesPanel } from "@/app/card/[game]/[cardId]/_components/graded-prices-panel";
import { EbaySoldCompsPanel } from "@/app/card/[game]/[cardId]/_components/ebay-sold-comps-panel";
import { RarityBadge } from "@/components/cards/rarity-badge";
import { FinishBadge } from "@/components/cards/finish-badge";
import { DomainIcon } from "@/components/cards/riftbound-icons";
import { OtherVersionsPanel } from "@/app/card/[game]/[cardId]/_components/other-versions-panel";
import { SportsParallelsPanel } from "@/app/card/[game]/[cardId]/_components/sports-parallels-panel";
import { getSportsCardGroupVariants } from "@/lib/sportscards/manage";
import { Badge } from "@/components/ui/badge";
import { formatReleaseDate } from "@/lib/format/date";
import { defaultFinishLabel } from "@/lib/games/pokemon/mapper";
import { requireSession } from "@/lib/auth/require-session";
import { getFinishDisplayLabel } from "@/lib/games/pokemon/finish-patterns";
import { CardImage } from "@/components/cards/card-image";
import { ParallelBadge } from "@/components/sportscards/parallel-badge";

type CardData =
  | { kind: "tcg"; item: NonNullable<Awaited<ReturnType<typeof getTcgCard>>> }
  | { kind: "sports"; item: NonNullable<Awaited<ReturnType<typeof getSportsCard>>> };

const getTcgCard = unstable_cache(
  (game: string, cardId: string) => {
    const id = `${game}:${decodeURIComponent(cardId)}`;
    return db.catalogItem.findUnique({ where: { id }, include: { set: true, game: true } });
  },
  ["card-detail-tcg"],
  { tags: ["catalog-card"], revalidate: 86400 }
);

const getSportsCard = unstable_cache(
  (cardId: string) => db.sportsCardItem.findUnique({ where: { id: decodeURIComponent(cardId) } }),
  ["card-detail-sports"],
  { tags: ["catalog-card"], revalidate: 86400 }
);

// Wrapped in React's cache() so the identical (game, cardId) lookup done
// once in the page body and again, independently, inside generateMetadata()
// below dedupes to a single call within one request/render pass — on top
// of the unstable_cache above, which persists the underlying DB read across
// separate requests/isolates.
const getCard = cache(async (game: string, cardId: string): Promise<CardData | null> => {
  const meta = getGameMeta(game);
  if (meta?.kind === "sports") {
    const item = await getSportsCard(cardId);
    return item ? { kind: "sports", item } : null;
  }
  const item = await getTcgCard(game, cardId);
  return item ? { kind: "tcg", item } : null;
});

/**
 * Every other priced finish/variation of this same physical card — same
 * (gameId, externalId), a different row (see CatalogItem.variantKey). Only
 * Pokémon rows ever have siblings today; every other game's cards are still
 * one row per externalId, so this naturally resolves to an empty array for
 * them (and for a Pokémon card with only one priced finish) with no extra
 * check needed.
 */
const getSiblingVariants = unstable_cache(
  async (item: { id: string; gameId: string; externalId: string }) => {
    const rows = await db.catalogItem.findMany({
      where: { gameId: item.gameId, externalId: item.externalId, id: { not: item.id } },
      select: { id: true, variantKey: true, latestPriceRaw: true, set: { select: { code: true } } },
    });
    return rows
      .map((r) => ({
        id: r.id,
        priceRaw: r.latestPriceRaw != null ? Number(r.latestPriceRaw) : null,
        label: getFinishDisplayLabel(r.set.code, r.variantKey, defaultFinishLabel(r.variantKey)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  },
  ["card-detail-sibling-variants"],
  { tags: ["catalog-card"], revalidate: 86400 }
);

/**
 * Every parallel/refractor of a sports card, base first then rarity order —
 * see getSportsCardGroupVariants in lib/sportscards/manage.ts. Cached the
 * same way as getSiblingVariants above.
 */
const getSportsCardVariants = unstable_cache(
  (sportsCardItemId: string) => getSportsCardGroupVariants(sportsCardItemId),
  ["card-detail-sports-variants"],
  { tags: ["catalog-card"], revalidate: 86400 }
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ game: string; cardId: string }>;
}): Promise<Metadata> {
  const { game, cardId } = await params;
  const card = await getCard(game, cardId);
  if (!card) return { title: "Card not found" };
  if (card.kind === "sports") {
    const setLabel = [card.item.year, card.item.distributor, card.item.setName].filter(Boolean).join(" ");
    return { title: `${card.item.playerName} — ${setLabel}` };
  }
  return { title: `${card.item.name} — ${card.item.set.name}` };
}

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ game: string; cardId: string }>;
}) {
  await requireSession();
  const { game, cardId } = await params;
  const card = await getCard(game, cardId);
  if (!card) notFound();
  const gameMeta = getGameMeta(game);

  if (card.kind === "sports") {
    const item = card.item;
    const setName = [item.year, item.distributor, item.setName].filter(Boolean).join(" ");
    const priceRaw = item.latestPriceRaw != null ? Number(item.latestPriceRaw) : null;
    const cardName = item.parallelName ? `${item.playerName} — ${item.parallelName}` : item.playerName;
    const releaseDateLabel = formatReleaseDate(item.releaseDate);
    const sportsVariants = await getSportsCardVariants(item.id);

    return (
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <CardBreadcrumb
          gameId={game}
          gameName={gameMeta?.name ?? "Basketball (NBA)"}
          setId={`${item.year ?? ""}::${item.distributor ?? ""}::${item.setName}`}
          setName={setName}
          cardName={cardName}
        />

        <div className="mb-6 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">{cardName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{setName}</span>
              {item.cardNumber && <span>· #{item.cardNumber}</span>}
              {item.teamName && <span>· {item.teamName}</span>}
              {item.serialLimit && <span className="num-tabular">· /{item.serialLimit}</span>}
              {releaseDateLabel && <span>· {releaseDateLabel}</span>}
              {item.isAutograph && <Badge variant="secondary">Autograph</Badge>}
              {item.isRelic && <Badge variant="secondary">Relic</Badge>}
            </div>
          </div>
        </div>

        <SportsParallelsPanel gameId={game} currentId={item.id} variants={sportsVariants} />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr_300px]">
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="relative aspect-[5/7] w-full">
              <CardImage
                src={item.imageUrl}
                alt={cardName}
                sizes="260px"
                className="object-contain p-3"
                fallbackVariant="icon-label"
                overlay={
                  <ParallelBadge
                    parallelName={item.parallelName}
                    serialLimit={item.serialLimit}
                    inherited={item.imageIsInherited}
                  />
                }
              />
            </div>
          </div>

          <PriceHistoryPanel
            gameId={game}
            cardExternalId={item.id}
            currentPriceRaw={priceRaw}
            currentChangePct={item.priceChangePct}
          />

          <div className="flex flex-col gap-4">
            <CollectionPanel sportsCardItemId={item.id} cardName={cardName} suggestedPrice={priceRaw} />
            <ShortlistPanel sportsCardItemId={item.id} cardName={cardName} />
            <BusinessHoldingsPanel sportsCardItemId={item.id} cardName={cardName} suggestedPrice={priceRaw} />
            <GradedPricesPanel gameId={game} cardExternalId={item.id} />
            <EbaySoldCompsPanel gameId={game} cardExternalId={item.id} cardName={cardName} />
            <ShopPanel cardName={cardName} gameId={game} />
          </div>
        </div>
      </div>
    );
  }

  const item = card.item;
  const priceRaw = item.latestPriceRaw != null ? Number(item.latestPriceRaw) : null;
  const releaseDateLabel = formatReleaseDate(item.set.releaseDate);
  const variantKey = item.variantKey || null;
  const variantLabel = variantKey
    ? getFinishDisplayLabel(item.set.code, variantKey, defaultFinishLabel(variantKey))
    : null;
  const displayName = withEnglishName(
    variantLabel ? `${item.name} — ${variantLabel}` : item.name,
    item.nameEn
  );
  const siblingVariants = await getSiblingVariants(item);
  // Every price/graded-price/eBay-comps lookup below is keyed by the full
  // CatalogItem.id, not the bare externalId — see cardDetailHref for why:
  // one externalId can now back several rows (Pokémon finish variants), so
  // the id-minus-"<gameId>:"-prefix slug is what round-trips back to THIS
  // row specifically, rather than always resolving to the primary variant.
  const detailSlug = item.id.slice(game.length + 1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <CardBreadcrumb
        gameId={game}
        gameName={gameMeta?.name ?? item.game.name}
        setId={item.setId}
        setName={item.set.name}
        setNameEn={item.set.nameEn}
        cardName={displayName}
      />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{item.name}</h1>
          {item.nameEn && <p className="text-sm text-muted-foreground">{item.nameEn}</p>}
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span>{item.set.nameEn ? `${item.set.name} (${item.set.nameEn})` : item.set.name}</span>
            {item.number && <span>· {item.number}</span>}
            {item.cardType && <span>· {item.cardType}</span>}
            {releaseDateLabel && <span>· {releaseDateLabel}</span>}
            {item.artist && <span>· Illustrated by {item.artist}</span>}
            {item.language !== "EN" && <span>· {item.language}</span>}
            <RarityBadge rarity={item.rarity} cardType={item.cardType} />
            <FinishBadge variantKey={variantKey} label={variantLabel} />
            {item.domain.length > 0 && (
              <span className="flex items-center gap-1">
                {item.domain.map((d) => (
                  <DomainIcon key={d} domain={d} />
                ))}
              </span>
            )}
          </div>
        </div>
      </div>

      <OtherVersionsPanel
        gameId={game}
        current={{ id: item.id, priceRaw, label: variantLabel ?? "This finish" }}
        siblings={siblingVariants}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr_300px]">
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="relative aspect-[5/7] w-full">
            <CardImage
              src={item.imageLargeUrl ?? item.imageSmallUrl}
              alt={item.name}
              sizes="260px"
              className="object-contain p-3"
              fallbackVariant="icon-label"
            />
          </div>
        </div>

        <PriceHistoryPanel
          gameId={game}
          cardExternalId={detailSlug}
          currentPriceRaw={priceRaw}
          currentChangePct={item.priceChangePct}
        />

        <div className="flex flex-col gap-4">
          <CollectionPanel
            catalogItemId={item.id}
            cardName={displayName}
            suggestedPrice={priceRaw}
            language={item.language}
          />
          <ShortlistPanel catalogItemId={item.id} cardName={displayName} />
          <BusinessHoldingsPanel
            catalogItemId={item.id}
            cardName={displayName}
            suggestedPrice={priceRaw}
            language={item.language}
          />
          <GradedPricesPanel gameId={game} cardExternalId={detailSlug} />
          <EbaySoldCompsPanel gameId={game} cardExternalId={detailSlug} cardName={displayName} />
          <ShopPanel cardName={item.name} gameId={game} />
        </div>
      </div>
    </div>
  );
}
