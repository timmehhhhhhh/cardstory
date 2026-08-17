import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TrendingDown, TrendingUp } from "lucide-react";
import { db } from "@/lib/db";
import { CardNumberBadge } from "@/components/cards/card-number-badge";
import type { ShowcasePayload } from "@/lib/showcase/types";
import { formatMoney, formatPct } from "@/lib/utils/format";
import type { SupportedCurrency } from "@/lib/constants";

async function getSnapshot(shareId: string) {
  return db.showcaseSnapshot.findUnique({ where: { id: shareId } });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shareId: string }>;
}): Promise<Metadata> {
  const { shareId } = await params;
  const snapshot = await getSnapshot(shareId);
  return { title: snapshot ? `${snapshot.title} — Showcase` : "Showcase not found" };
}

export default async function ShowcasePage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const snapshot = await getSnapshot(shareId);
  if (!snapshot) notFound();

  const payload = snapshot.payload as unknown as ShowcasePayload;
  const currency = payload.currency as SupportedCurrency;
  const positive = payload.totalGainLoss >= 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8 text-center">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          CardStory Showcase
        </p>
        <h1 className="text-2xl font-bold">{snapshot.title}</h1>
        <p className="num-tabular mt-2 text-4xl font-bold">{formatMoney(payload.totalValue, currency)}</p>
        {payload.totalGainLossPct != null && (
          <p
            className={
              "num-tabular mt-1 flex items-center justify-center gap-1 text-sm font-medium " +
              (positive ? "text-positive" : "text-negative")
            }
          >
            {positive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
            {formatMoney(payload.totalGainLoss, currency)} ({formatPct(payload.totalGainLossPct)})
          </p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Snapshot as of {snapshot.updatedAt.toISOString().slice(0, 10)} · {payload.itemCount} items ·
          not a live sync
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {payload.items.map((item) => (
          <Link
            key={item.catalogItemId}
            href={`/card/${item.gameId}/${item.externalId}`}
            className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface hover:border-primary/40"
          >
            <div className="relative aspect-[5/7] w-full bg-muted">
              {item.imageSmallUrl && (
                <Image src={item.imageSmallUrl} alt={item.name} fill unoptimized className="object-contain p-2" />
              )}
            </div>
            <div className="p-2.5">
              <div className="flex items-center gap-1.5">
                <p className="min-w-0 truncate text-sm font-medium">{item.name}</p>
                <CardNumberBadge number={item.number} className="flex-none" />
              </div>
              <p className="num-tabular text-xs text-muted-foreground">
                Qty {item.quantity} · {formatMoney(item.marketValue, currency)}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Link href="/explore" className="text-sm text-primary hover:underline">
          Build your own collection on CardStory →
        </Link>
      </div>
    </div>
  );
}
