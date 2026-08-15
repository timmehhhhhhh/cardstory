import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getGameMeta } from "@/lib/games/registry";
import { CardBreadcrumb } from "@/app/card/[game]/[cardId]/_components/breadcrumb";
import { PriceHistoryPanel } from "@/app/card/[game]/[cardId]/_components/price-history-panel";
import { CollectionPanel } from "@/app/card/[game]/[cardId]/_components/collection-panel";
import { ShopPanel } from "@/app/card/[game]/[cardId]/_components/shop-panel";
import { GradedPricesPanel } from "@/app/card/[game]/[cardId]/_components/graded-prices-panel";
import { RarityBadge } from "@/components/cards/rarity-badge";
import { Badge } from "@/components/ui/badge";
import { formatReleaseDate } from "@/lib/format/date";

type CardData =
  | { kind: "tcg"; item: NonNullable<Awaited<ReturnType<typeof getTcgCard>>> }
  | { kind: "sports"; item: NonNullable<Awaited<ReturnType<typeof getSportsCard>>> };

function getTcgCard(game: string, cardId: string) {
  const id = `${game}:${decodeURIComponent(cardId)}`;
  return db.catalogItem.findUnique({ where: { id }, include: { set: true, game: true } });
}

function getSportsCard(cardId: string) {
  return db.sportsCardItem.findUnique({ where: { id: decodeURIComponent(cardId) } });
}

async function getCard(game: string, cardId: string): Promise<CardData | null> {
  const meta = getGameMeta(game);
  if (meta?.kind === "sports") {
    const item = await getSportsCard(cardId);
    return item ? { kind: "sports", item } : null;
  }
  const item = await getTcgCard(game, cardId);
  return item ? { kind: "tcg", item } : null;
}

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

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr_300px]">
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            {item.imageUrl ? (
              <div className="relative aspect-[5/7] w-full">
                <Image
                  src={item.imageUrl}
                  alt={cardName}
                  fill
                  unoptimized
                  referrerPolicy="no-referrer"
                  sizes="260px"
                  className="object-contain p-3"
                />
              </div>
            ) : (
              <div className="flex aspect-[5/7] items-center justify-center text-sm text-muted-foreground">
                No image
              </div>
            )}
          </div>

          <PriceHistoryPanel
            gameId={game}
            cardExternalId={item.id}
            currentPriceRaw={priceRaw}
            currentChangePct={item.priceChangePct}
          />

          <div className="flex flex-col gap-4">
            <CollectionPanel sportsCardItemId={item.id} cardName={cardName} suggestedPrice={priceRaw} />
            <GradedPricesPanel gameId={game} cardExternalId={item.id} />
            <ShopPanel cardName={cardName} gameId={game} />
          </div>
        </div>
      </div>
    );
  }

  const item = card.item;
  const priceRaw = item.latestPriceRaw != null ? Number(item.latestPriceRaw) : null;
  const releaseDateLabel = formatReleaseDate(item.set.releaseDate);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <CardBreadcrumb
        gameId={game}
        gameName={gameMeta?.name ?? item.game.name}
        setId={item.setId}
        setName={item.set.name}
        cardName={item.name}
      />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{item.name}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span>{item.set.name}</span>
            {item.number && <span>· {item.number}</span>}
            {item.cardType && <span>· {item.cardType}</span>}
            {releaseDateLabel && <span>· {releaseDateLabel}</span>}
            {item.artist && <span>· Illustrated by {item.artist}</span>}
            <RarityBadge rarity={item.rarity} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr_300px]">
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {item.imageLargeUrl || item.imageSmallUrl ? (
            <div className="relative aspect-[5/7] w-full">
              <Image
                src={item.imageLargeUrl ?? item.imageSmallUrl ?? ""}
                alt={item.name}
                fill
                unoptimized
                sizes="260px"
                className="object-contain p-3"
              />
            </div>
          ) : (
            <div className="flex aspect-[5/7] items-center justify-center text-sm text-muted-foreground">
              No image
            </div>
          )}
        </div>

        <PriceHistoryPanel
          gameId={game}
          cardExternalId={item.externalId}
          currentPriceRaw={priceRaw}
          currentChangePct={item.priceChangePct}
        />

        <div className="flex flex-col gap-4">
          <CollectionPanel catalogItemId={item.id} cardName={item.name} suggestedPrice={priceRaw} />
          <GradedPricesPanel gameId={game} cardExternalId={item.externalId} />
          <ShopPanel cardName={item.name} gameId={game} />
        </div>
      </div>
    </div>
  );
}
