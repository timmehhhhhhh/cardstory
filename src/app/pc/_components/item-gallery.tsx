"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Pencil, ShoppingBag, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CardNumberBadge } from "@/components/cards/card-number-badge";
import { usePCStore } from "@/lib/pc/store";
import { formatMoney, formatPct } from "@/lib/utils/format";
import { SportsCardImageDialog } from "@/components/sportscards/sports-card-image-dialog";
import { EditHoldingDialog } from "@/components/pc/edit-holding-dialog";
import type { EnrichedHolding } from "@/lib/pc/selectors";
import { CardImage } from "@/components/cards/card-image";
import { ParallelBadge } from "@/components/sportscards/parallel-badge";
import { EmptyHoldings } from "@/app/pc/_components/empty-holdings";
import { useAddToShortlist } from "@/lib/shortlist/use-add-to-shortlist";

/**
 * The image-first way of reading a pc — the same rows ItemGrid renders,
 * laid out as a grid of large card scans with value underneath. Chosen via
 * ViewModeToggle (Preferences.viewMode === "grid").
 *
 * ItemGrid's row shows more per item (paid, market-at-add, full subtitle);
 * this trades that detail for card art you can actually recognise across a
 * whole collection at once, which is what a binder-style scan of a PC is
 * for. Anything dropped here is one click away on the card's detail page.
 */
export function ItemGallery({
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
  /** Where a shortlist add from this grid should be recorded as coming from — e.g. "PC · My Collection" or "Business Inventory". */
  sourceLabel: string;
}) {
  const currency = usePCStore((s) => s.preferences.currency);
  const removeHoldings = usePCStore((s) => s.removeHoldings);
  const [editingHolding, setEditingHolding] = React.useState<EnrichedHolding | null>(null);
  const addToShortlist = useAddToShortlist();
  const [justShortlistedId, setJustShortlistedId] = React.useState<string | null>(null);

  if (rows.length === 0) return <EmptyHoldings />;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {rows.map((r) => {
        const positive = r.gainLoss >= 0;
        const isSelected = selected.has(r.id);

        // The tile's content sits under a full-bleed <Link>/select button and
        // is `pointer-events-none` so clicks reach it — which would also swallow
        // the sports "attach a photo" affordance, hence the `pointer-events-auto`
        // layer around it. In bulk mode it's dropped entirely (`attachable`
        // false): selection is the only thing a click should mean there.
        const art = (attachable: boolean) => (
          <div className="relative aspect-[5/7] w-full bg-muted">
            <CardImage
              src={r.display.imageUrl}
              alt={r.display.name}
              sizes="(min-width:1024px) 200px, (min-width:640px) 30vw, 45vw"
              className="object-contain p-1.5"
              fallbackVariant="icon-label"
              // Same routing as ItemGrid: a rotted URL lands on the sports
              // "attach a photo" affordance rather than a broken image.
              fallback={
                attachable && r.sportsCardItem ? (
                  <span className="pointer-events-auto absolute inset-0 z-10">
                    <SportsCardImageDialog sportsCardItemId={r.sportsCardItem.id} />
                  </span>
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
            <CardNumberBadge number={r.display.number} variant="overlay" />
          </div>
        );

        // Pulled out of the subtitle string rather than parsed from it: this
        // is the one piece of text that actually distinguishes two tiles of
        // the same player (e.g. two LaMelo Ball cards differ by parallel,
        // not by name), so it gets its own guaranteed-visible line instead
        // of riding at the end of a single truncated line where a long set
        // name pushes it off before it ever renders.
        const parallelLabel = r.display.imageWatermark
          ? [
              r.display.imageWatermark.parallelName,
              r.display.imageWatermark.serialLimit ? `/${r.display.imageWatermark.serialLimit}` : null,
            ]
              .filter(Boolean)
              .join(" ")
          : null;

        const caption = (
          <div className="flex min-w-0 flex-col gap-0.5 p-2.5">
            <p className="truncate text-sm leading-tight font-medium">{r.display.name}</p>
            {r.display.nameEn && (
              <p className="truncate text-xs leading-snug text-muted-foreground">{r.display.nameEn}</p>
            )}
            {parallelLabel && (
              <p className="line-clamp-2 text-xs leading-snug font-semibold text-primary">
                {parallelLabel}
              </p>
            )}
            {/* line-clamp-2 rather than truncate: this string is
                "[year distributor setName] · #number · parallel · serial",
                and a single truncated line was cutting off the set name
                itself (never mind the parallel/serial after it). Two lines
                covers the vast majority of real set names. */}
            <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
              {r.display.subtitle}
            </p>
            <div className="mt-1 flex items-baseline justify-between gap-1.5">
              <span className="num-tabular text-sm font-semibold">
                {formatMoney(r.marketValue, currency)}
              </span>
              {r.gainLossPct != null && (
                <span
                  className={cn(
                    "num-tabular flex flex-none items-center gap-0.5 text-[11px]",
                    positive ? "text-positive" : "text-negative"
                  )}
                >
                  {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                  {formatPct(r.gainLossPct)}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1">
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
            </div>
          </div>
        );

        const tileClass = cn(
          "group relative flex flex-col overflow-hidden rounded-xl border bg-surface transition-colors",
          // A ring on top of the border — at gallery density the checkbox
          // alone is too small to scan a selection by.
          isSelected ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"
        );

        // In bulk mode the whole tile is the checkbox target rather than a
        // link: at this size the card art *is* the hit area a user aims
        // for, and sending them to a detail page mid-selection is never
        // what they meant. Outside bulk mode it goes back to being a link.
        if (bulkMode) {
          return (
            <div key={r.id} className={tileClass}>
              <button
                type="button"
                aria-label={`Select ${r.display.name}`}
                aria-pressed={isSelected}
                onClick={() => onToggleSelect(r.id)}
                className="absolute inset-0 z-0"
              />
              <div className="pointer-events-none">
                {art(false)}
                {caption}
              </div>
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelect(r.id)}
                aria-label={`Select ${r.display.name}`}
                className="absolute right-1.5 top-1.5 z-10 border-border bg-background/80 backdrop-blur"
              />
            </div>
          );
        }

        return (
          <div key={r.id} className={tileClass}>
            {/* Stretched link layered beneath the remove button rather than
                wrapping it — see CardTile for why nesting a control inside a
                <Link> leaves Next's router with a stale transition. */}
            {r.display.href && (
              <Link href={r.display.href} aria-label={r.display.name} className="absolute inset-0 z-0" />
            )}
            <div className="pointer-events-none">
              {art(true)}
              {caption}
            </div>
            <div className="absolute right-1.5 top-1.5 z-10 flex gap-1">
              {(r.catalogItemId || r.sportsCardItemId) && (
                <button
                  type="button"
                  aria-label={`Add ${r.display.name} to shortlist`}
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
                  className="rounded-full bg-background/70 p-1.5 text-muted-foreground opacity-0 backdrop-blur transition-opacity hover:text-primary focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                >
                  {justShortlistedId === r.id ? (
                    <Check className="size-3.5 text-positive" />
                  ) : (
                    <ShoppingBag className="size-3.5" />
                  )}
                </button>
              )}
              <button
                type="button"
                aria-label={`Edit ${r.display.name}`}
                onClick={() => setEditingHolding(r)}
                className="rounded-full bg-background/70 p-1.5 text-muted-foreground opacity-0 backdrop-blur transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Remove ${r.display.name} from PC`}
                onClick={() => removeHoldings(activePCId, [r.id])}
                className="rounded-full bg-background/70 p-1.5 text-muted-foreground opacity-0 backdrop-blur transition-opacity hover:text-negative focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
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
