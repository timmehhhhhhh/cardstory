import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getGameMeta } from "@/lib/games/registry";
import { CardBreadcrumb } from "@/app/card/[game]/[cardId]/_components/breadcrumb";
import { PriceHistoryPanel } from "@/app/card/[game]/[cardId]/_components/price-history-panel";
import { CollectionPanel } from "@/app/card/[game]/[cardId]/_components/collection-panel";
import { ShopPanel } from "@/app/card/[game]/[cardId]/_components/shop-panel";
import { RarityBadge } from "@/components/cards/rarity-badge";

async function getCard(game: string, cardId: string) {
  const id = `${game}:${decodeURIComponent(cardId)}`;
  return db.catalogItem.findUnique({
    where: { id },
    include: { set: true, game: true },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ game: string; cardId: string }>;
}): Promise<Metadata> {
  const { game, cardId } = await params;
  const item = await getCard(game, cardId);
  if (!item) return { title: "Card not found" };
  return { title: `${item.name} — ${item.set.name}` };
}

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ game: string; cardId: string }>;
}) {
  const { game, cardId } = await params;
  const item = await getCard(game, cardId);
  if (!item) notFound();
  const gameMeta = getGameMeta(game);

  const priceRaw = item.latestPriceRaw != null ? Number(item.latestPriceRaw) : null;

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
          <ShopPanel cardName={item.name} gameId={game} />
        </div>
      </div>
    </div>
  );
}
