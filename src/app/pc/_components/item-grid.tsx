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
import { ArchiveDetailsDialog } from "@/components/pc/archive-details-dialog";
import { withEnglishName } from "@/lib/catalog/card-name";
import type { EnrichedHolding } from "@/lib/pc/selectors";
import { CardImage } from "@/components/cards/card-image";
import { ParallelBadge } from "@/components/sportscards/parallel-badge";
import { EmptyHoldings } from "@/app/pc/_components/empty-holdings";
import { useAddToShortlist, useShortlistQuantity } from "@/lib/shortlist/use-add-to-shortlist";
import { CardStack } from "@/components/cards/card-stack";
import { CardStoryDialog } from "@/components/cards/card-story-dialog";
import { groupHoldingsIntoStacks, holdingToStoryFace } from "@/lib/collections/stacks";

/**
 * One row's worth of content for a single holding — the front (or only)
 * face of a card stack (see card-stack.tsx). Pulled out of ItemGrid so both
 * a lone card and every face of a duplicate stack render through the exact
 * same markup.
 */
function HoldingRowFace({
  r,
  bulkMode,
  isSelected,
  onToggleSelect,
  sourceLabel,
  onEdit,
  onArchive,
  stackBadge,
  suppressLink,
}: {
  r: EnrichedHolding;
  bulkMode: boolean;
  isSelected: boolean;
  onToggleSelect: (holdingId: string) => void;
  sourceLabel: string;
  onEdit: (holding: EnrichedHolding) => void;
  onArchive: (holding: EnrichedHolding) => void;
  /** "1 of 4" when this face belongs to a stack — replaces the plain Qty badge. */
  stackBadge?: string;
  /** See item-gallery.tsx's HoldingGalleryFace — same reasoning. */
  suppressLink?: boolean;
}) {
  const currency = usePCStore((s) => s.preferences.currency);
  const addToShortlist = useAddToShortlist();
  const shortlistQuantity = useShortlistQuantity(r.catalogItemId, r.sportsCardItemId);
  const [justShortlisted, setJustShortlisted] = React.useState(false);

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
        fallback={r.sportsCardItem ? <SportsCardImageDialog sportsCardItemId={r.sportsCardItem.id} /> : undefined}
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
      {r.display.nameEn && (
        <p className="truncate text-xs leading-snug text-muted-foreground sm:text-sm">{r.display.nameEn}</p>
      )}
      <p className="mt-0.5 text-xs leading-snug text-muted-foreground sm:text-sm">{r.display.subtitle}</p>
      {(r.costBasisTotal > 0 || r.priceAtAcquisitionTotal != null) && (
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/80">
          Paid {formatMoneyIn(r.costBasisTotal, r.costBasisCurrency)}
          {r.priceAtAcquisitionTotal != null &&
            ` · Market at add ${formatMoney(r.priceAtAcquisitionTotal, currency)}`}
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="font-normal text-muted-foreground">
          {stackBadge ?? `Qty ${r.quantity}`}
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
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3 sm:gap-4 sm:p-4">
      {bulkMode && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(r.id)}
          aria-label="Select item"
          className="mt-1"
        />
      )}
      {image}
      {r.display.href && !suppressLink ? (
        <Link href={r.display.href} className="flex min-w-0 flex-1 items-start gap-3">
          {details}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-3">{details}</div>
      )}
      <div className="flex flex-none flex-col items-end justify-between gap-3 self-stretch">
        <div className="text-right">
          <p className="num-tabular text-sm font-semibold sm:text-base">{formatMoney(r.marketValue, currency)}</p>
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
          // See item-gallery.tsx's matching comment — stops these buttons
          // from also registering as a tap-to-open-story on the stack.
          <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
            {(r.catalogItemId || r.sportsCardItemId) && (
              <span className="relative z-10 inline-flex flex-none">
                <button
                  type="button"
                  aria-label={shortlistQuantity > 0 ? "On shortlist" : "Add to shortlist"}
                  aria-pressed={shortlistQuantity > 0}
                  title={shortlistQuantity > 0 ? "On shortlist" : "Add to shortlist"}
                  onClick={() => {
                    addToShortlist({
                      kind: r.kind ?? "tcg",
                      catalogItemId: r.catalogItemId,
                      sportsCardItemId: r.sportsCardItemId,
                      source: sourceLabel,
                    });
                    setJustShortlisted(true);
                    setTimeout(() => setJustShortlisted(false), 1200);
                  }}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
                >
                  {justShortlisted ? (
                    <Check className="size-4 text-positive" />
                  ) : (
                    <ShoppingBag className="size-4" />
                  )}
                </button>
                {shortlistQuantity > 0 && (
                  <span
                    aria-label={`${shortlistQuantity} on your shortlist`}
                    className="pointer-events-none absolute -right-1 -top-1 z-10 flex h-4 min-w-4 items-center justify-center rounded-full border border-border bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground"
                  >
                    {shortlistQuantity > 99 ? "99+" : shortlistQuantity}
                  </span>
                )}
              </span>
            )}
            <button
              type="button"
              aria-label="Edit item"
              onClick={() => onEdit(r)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Archive card"
              title="Archive card"
              onClick={() => onArchive(r)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-negative"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The detail-dense way of reading a pc: one row per holding, with cost
 * basis, market-at-add and the full subtitle alongside a modest scan.
 * ItemGallery is the image-first alternative — see ViewModeToggle.
 *
 * Multiple holdings of the same card (see groupHoldingsIntoStacks) collapse
 * into one CardStack row — swipe/click the chevrons to cycle "1 of N", tap
 * the art to read that copy's card story (card-story-dialog.tsx).
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
  const [editingHolding, setEditingHolding] = React.useState<EnrichedHolding | null>(null);
  const [archivingHolding, setArchivingHolding] = React.useState<EnrichedHolding | null>(null);
  const [storyStack, setStoryStack] = React.useState<{ faces: EnrichedHolding[]; index: number } | null>(null);
  const archiveHoldings = usePCStore((s) => s.archiveHoldings);

  if (rows.length === 0) return <EmptyHoldings />;

  const stacks = groupHoldingsIntoStacks(rows);

  return (
    <div className="flex flex-col gap-2.5">
      {stacks.map((stack) => (
        <CardStack
          key={stack.key}
          stack={stack}
          variant="row"
          onActivate={bulkMode ? undefined : (face, index) => setStoryStack({ faces: stack.faces, index })}
          renderFace={(r, { index, total }) => (
            <HoldingRowFace
              key={r.id}
              r={r}
              bulkMode={bulkMode}
              isSelected={selected.has(r.id)}
              onToggleSelect={onToggleSelect}
              sourceLabel={sourceLabel}
              onEdit={setEditingHolding}
              onArchive={setArchivingHolding}
              stackBadge={total > 1 ? `${index + 1} of ${total}` : undefined}
              suppressLink={total > 1}
            />
          )}
        />
      ))}
      <EditHoldingDialog
        holding={editingHolding}
        pcId={activePCId}
        open={editingHolding !== null}
        onOpenChange={(open) => {
          if (!open) setEditingHolding(null);
        }}
      />
      <ArchiveDetailsDialog
        open={archivingHolding !== null}
        onOpenChange={(open) => {
          if (!open) setArchivingHolding(null);
        }}
        title="Archive card"
        description={
          archivingHolding ? withEnglishName(archivingHolding.display.name, archivingHolding.display.nameEn) : undefined
        }
        submitLabel="Archive card"
        onSubmit={(letGo) => {
          if (!archivingHolding) return;
          archiveHoldings(activePCId, [archivingHolding.id], letGo);
          setArchivingHolding(null);
        }}
      />
      {storyStack && (
        <CardStoryDialog
          faces={storyStack.faces.map(holdingToStoryFace)}
          initialIndex={storyStack.index}
          open={storyStack !== null}
          onOpenChange={(open) => {
            if (!open) setStoryStack(null);
          }}
        />
      )}
    </div>
  );
}
