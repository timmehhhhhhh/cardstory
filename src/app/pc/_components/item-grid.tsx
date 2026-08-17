"use client";

import Image from "next/image";
import Link from "next/link";
import { ImageOff, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CardNumberBadge } from "@/components/cards/card-number-badge";
import { usePCStore } from "@/lib/pc/store";
import { formatMoney, formatPct } from "@/lib/utils/format";
import { SportsCardImageDialog } from "@/components/sportscards/sports-card-image-dialog";
import type { EnrichedHolding } from "@/lib/pc/selectors";

export function ItemGrid({
  rows,
  bulkMode,
  selected,
  onToggleSelect,
  activePCId,
}: {
  rows: EnrichedHolding[];
  bulkMode: boolean;
  selected: Set<string>;
  onToggleSelect: (holdingId: string) => void;
  activePCId: string;
}) {
  const currency = usePCStore((s) => s.preferences.currency);
  const removeHoldings = usePCStore((s) => s.removeHoldings);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-16 text-center">
        <p className="font-medium">Nothing here yet</p>
        <p className="text-sm text-muted-foreground">
          Head to <Link href="/explore" className="text-primary hover:underline">Explore</Link> and add a
          card, or use &quot;Add Sports Card&quot; above.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => {
        const positive = r.gainLoss >= 0;
        const needsImage = !r.display.imageUrl && r.sportsCardItem;

        // Card art gets real estate here (up to 96px wide, proper 5:7 card
        // aspect) since this is the primary visual identifier in the list —
        // name/subtitle/badges wrap instead of truncating so no detail is
        // ever hidden to make room for the bigger image.
        const image = (
          <div className="relative aspect-[5/7] w-20 flex-none overflow-hidden rounded-lg bg-muted ring-1 ring-border/60 sm:w-24">
            {r.display.imageUrl ? (
              <Image
                src={r.display.imageUrl}
                alt=""
                fill
                sizes="(min-width: 640px) 96px, 80px"
                unoptimized
                className="object-contain"
              />
            ) : needsImage ? (
              <SportsCardImageDialog sportsCardItemId={r.sportsCardItem!.id} />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground/50">
                <ImageOff className="size-5" />
              </div>
            )}
          </div>
        );

        const details = (
          <div className="min-w-0 flex-1 py-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm leading-snug font-medium sm:text-base">{r.display.name}</p>
              <CardNumberBadge number={r.display.number} />
            </div>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground sm:text-sm">
              {r.display.subtitle}
            </p>
            {(r.costBasisTotal > 0 || r.priceAtAcquisitionTotal != null) && (
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/80">
                Paid {formatMoney(r.costBasisTotal, currency)}
                {r.priceAtAcquisitionTotal != null &&
                  ` · Market at add ${formatMoney(r.priceAtAcquisitionTotal, currency)}`}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="font-normal text-muted-foreground">
                Qty {r.quantity}
              </Badge>
              {r.condition === "graded" && (
                <Badge variant="outline" className="font-normal text-muted-foreground">
                  {r.gradeCompany ?? ""} {r.gradeValue ?? ""}
                </Badge>
              )}
              <Badge variant="outline" className="font-normal text-muted-foreground">
                {r.display.groupLabel}
              </Badge>
            </div>
          </div>
        );

        return (
          <div
            key={r.id}
            className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3 sm:gap-4 sm:p-4"
          >
            {bulkMode && (
              <Checkbox
                checked={selected.has(r.id)}
                onCheckedChange={() => onToggleSelect(r.id)}
                aria-label="Select item"
                className="mt-1"
              />
            )}
            {image}
            {r.display.href ? (
              <Link href={r.display.href} className="flex min-w-0 flex-1 items-start gap-3">
                {details}
              </Link>
            ) : (
              <div className="flex min-w-0 flex-1 items-start gap-3">{details}</div>
            )}
            <div className="flex flex-none flex-col items-end justify-between gap-3 self-stretch">
              <div className="text-right">
                <p className="num-tabular text-sm font-semibold sm:text-base">
                  {formatMoney(r.marketValue, currency)}
                </p>
                {r.gainLossPct != null && (
                  <p
                    className={cn(
                      "num-tabular mt-0.5 flex items-center justify-end gap-0.5 text-xs",
                      positive ? "text-positive" : "text-negative"
                    )}
                  >
                    {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                    {formatPct(r.gainLossPct)}
                  </p>
                )}
              </div>
              {!bulkMode && (
                <button
                  type="button"
                  aria-label="Remove from PC"
                  onClick={() => removeHoldings(activePCId, [r.id])}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-negative"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
