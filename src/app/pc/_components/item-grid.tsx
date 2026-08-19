"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Pencil, ShoppingBag, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CardNumberBadge } from "@/components/cards/card-number-badge";
import { usePCStore } from "@/lib/pc/store";
import { formatMoney, formatMoneyIn, formatPct } from "@/lib/utils/format";
import { SportsCardImageDialog } from "@/components/sportscards/sports-card-image-dialog";
import { EditHoldingDialog } from "@/components/pc/edit-holding-dialog";
import type { EnrichedHolding } from "@/lib/pc/selectors";
import { CardImage } from "@/components/cards/card-image";
import { ParallelBadge } from "@/components/sportscards/parallel-badge";
import { EmptyHoldings } from "@/app/pc/_components/empty-holdings";
import { useAddToShortlist } from "@/lib/shortlist/use-add-to-shortlist";

/**
 * The detail-dense way of reading a pc: one row per holding, with cost
 * basis, market-at-add and the full subtitle alongside a modest scan.
 * ItemGallery is the image-first alternative — see ViewModeToggle.
 */
export function ItemGrid({
  rows,
  bulkMode,
  selected,
  onToggleSelect,
  activePCId,
  sourceLabel,
}: {
  rows: EnrichedHolding[];
  bulkMode: boolean;
  selected: Set<string>;
  onToggleSelect: (holdingId: string) => void;
  activePCId: string;
  /** Where a shortlist add from this list should be recorded as coming from — e.g. "PC · My Collection" or "Business Inventory". */
  sourceLabel: string;
}) {
  const currency = usePCStore((s) => s.preferences.currency);
  const removeHoldings = usePCStore((s) => s.removeHoldings);
  const [editingHolding, setEditingHolding] = React.useState<EnrichedHolding | null>(null);
  const addToShortlist = useAddToShortlist();
  const [justShortlistedId, setJustShortlistedId] = React.useState<string | null>(null);

  if (rows.length === 0) return <EmptyHoldings />;

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => {
        const positive = r.gainLoss >= 0;

        // Card art gets real estate here (up to 96px wide, proper 5:7 card
        // aspect) since this is the primary visual identifier in the list —
        // name/subtitle/badges wrap instead of truncating so no detail is
        // ever hidden to make room for the bigger image.
        const image = (
          <div className="relative aspect-[5/7] w-20 flex-none overflow-hidden rounded-lg bg-muted ring-1 ring-border/60 sm:w-24">
            <CardImage
              src={r.display.imageUrl}
              alt=""
              sizes="(min-width: 640px) 96px, 80px"
              className="object-contain"
              // Routing the sports affordance through `fallback` (rather than a
              // separate `!imageUrl` branch) means a *rotted* image URL now also
              // lands on "attach a photo" instead of a broken image.
              fallback={
                r.sportsCardItem ? (
                  <SportsCardImageDialog sportsCardItemId={r.sportsCardItem.id} />
                ) : undefined
              }
              overlay={
                r.display.imageWatermark ? (
                  <ParallelBadge
                    parallelName={r.display.imageWatermark.parallelName}
                    serialLimit={r.display.imageWatermark.serialLimit}
                    inherited={r.display.imageWatermark.inherited}
                  />
                ) : undefined
              }
            />
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
                Paid {formatMoneyIn(r.costBasisTotal, r.costBasisCurrency)}
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
              {r.condition === "raw" && r.rawCondition && (
                <Badge variant="outline" className="font-normal text-muted-foreground">
                  {r.rawCondition}
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
                <div className="flex items-center gap-1">
                  {(r.catalogItemId || r.sportsCardItemId) && (
                    <button
                      type="button"
                      aria-label="Add to shortlist"
                      title="Add to shortlist"
                      onClick={() => {
                        addToShortlist({
                          kind: r.kind ?? "tcg",
                          catalogItemId: r.catalogItemId,
                          sportsCardItemId: r.sportsCardItemId,
                          source: sourceLabel,
                        });
                        setJustShortlistedId(r.id);
                        setTimeout(() => setJustShortlistedId((cur) => (cur === r.id ? null : cur)), 1200);
                      }}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
                    >
                      {justShortlistedId === r.id ? (
                        <Check className="size-4 text-positive" />
                      ) : (
                        <ShoppingBag className="size-4" />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Edit item"
                    onClick={() => setEditingHolding(r)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Remove from PC"
                    onClick={() => removeHoldings(activePCId, [r.id])}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-negative"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
      <EditHoldingDialog
        holding={editingHolding}
        pcId={activePCId}
        open={editingHolding !== null}
        onOpenChange={(open) => {
          if (!open) setEditingHolding(null);
        }}
      />
    </div>
  );
}
