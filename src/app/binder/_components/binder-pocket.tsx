"use client";

import { GripVertical, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardNumberBadge } from "@/components/cards/card-number-badge";
import { CardImage } from "@/components/cards/card-image";
import { withEnglishName } from "@/lib/catalog/card-name";

/** A pocket's resolved display data — built by BinderPageView from a holding, a catalog-only ("not owned") reference, or a user-uploaded custom image, so BinderPocket itself never needs to branch on which. */
export interface PocketCard {
  name: string;
  nameEn: string | null;
  number: string | null;
  imageUrl: string | null;
  /** True when this card was placed from the picker's "Not Owned" tab, i.e. there's no backing Holding in the pc. */
  notOwned: boolean;
  /** True for a user-uploaded "Michi Method" image — never owned/not-owned, no card number. */
  isCustom: boolean;
}

/** Diagonal "not owned" stamp — same visual language as Deck Builder's (see deck-section-zone.tsx), with the scrim opacity lowered so the card underneath stays legible at the binder pocket's larger size. */
function NotOwnedWatermark() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/45">
      <span className="rotate-[-20deg] text-[9px] font-bold tracking-wide text-destructive uppercase">
        Not Owned
      </span>
    </div>
  );
}

export function BinderPocket({
  card,
  selected,
  draggedOver,
  showNumberTag,
  showNotOwnedTag,
  background,
  gridSpan,
  interactive = true,
  onSelect,
  onClear,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: {
  card: PocketCard | undefined;
  selected: boolean;
  draggedOver: boolean;
  /** Whether to show the card-number overlay tag in the top-left corner. */
  showNumberTag: boolean;
  /** Whether to show the "Not owned" watermark on catalog-only pockets. */
  showNotOwnedTag: boolean;
  /** Resolved CSS color behind the pocket (binder cover color, black, or white — see resolvedPocketBackgroundColor). */
  background: string;
  /** Set on a custom-image anchor pocket so it visually merges with the cells its span covers. */
  gridSpan?: { cols: number; rows: number };
  /** False in read-only contexts (the fullscreen preview) — suppresses click/drag/remove affordances entirely. */
  interactive?: boolean;
  onSelect?: () => void;
  onClear?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}) {
  const filled = !!card;

  return (
    <div
      onDragOver={interactive ? onDragOver : undefined}
      onDragLeave={interactive ? onDragLeave : undefined}
      onDrop={interactive ? onDrop : undefined}
      style={{
        background,
        gridColumn: gridSpan ? `span ${gridSpan.cols}` : undefined,
        gridRow: gridSpan ? `span ${gridSpan.rows}` : undefined,
      }}
      className={cn(
        "group/pocket relative aspect-[5/7] w-full overflow-hidden rounded-[3px] ring-1 ring-inset ring-black/10 transition-shadow",
        interactive && selected && "ring-2 ring-primary ring-offset-1 ring-offset-surface-elevated",
        interactive && draggedOver && "ring-2 ring-primary/70"
      )}
    >
      {filled ? (
        <button
          type="button"
          draggable={interactive && !card.isCustom}
          onDragStart={interactive ? onDragStart : undefined}
          onDragEnd={interactive ? onDragEnd : undefined}
          onClick={interactive ? onSelect : undefined}
          disabled={!interactive}
          aria-label={
            card.isCustom
              ? "Custom image — click to change"
              : `${withEnglishName(card.name, card.nameEn)} — click to swap`
          }
          className={cn(
            "absolute inset-0 flex size-full flex-col items-stretch justify-center",
            interactive ? "cursor-grab active:cursor-grabbing" : "cursor-default"
          )}
        >
          <CardImage
            src={card.imageUrl}
            alt=""
            className="object-contain p-0.5"
            fallback={
              <span className="flex size-full items-center justify-center px-1.5 text-center text-[10px] leading-tight text-muted-foreground">
                {card.name}
              </span>
            }
            overlay={card.notOwned && showNotOwnedTag ? <NotOwnedWatermark /> : undefined}
          />
          {/* CardImage only renders `overlay` above its <Image> — fall back to this sibling so the
              watermark still shows when the image itself failed to load or never had a URL. */}
          {!card.imageUrl && card.notOwned && showNotOwnedTag && <NotOwnedWatermark />}
          {interactive && (
            <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/70 to-transparent py-1 opacity-0 transition-opacity group-hover/pocket:opacity-100">
              <GripVertical className="size-3 text-white/80" />
            </span>
          )}
        </button>
      ) : (
        interactive && (
          <button
            type="button"
            onClick={onSelect}
            aria-label="Add card to this pocket"
            className={cn(
              "flex size-full flex-col items-center justify-center gap-1 text-muted-foreground/50 transition-colors hover:bg-black/5 hover:text-muted-foreground dark:hover:bg-white/5",
              selected && "text-primary"
            )}
          >
            <Plus className="size-4 sm:size-5" />
          </button>
        )
      )}

      {filled && !card.isCustom && showNumberTag && <CardNumberBadge number={card.number} variant="overlay" />}

      {filled && interactive && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear?.();
          }}
          aria-label={`Remove ${card.isCustom ? "this custom image" : withEnglishName(card.name, card.nameEn)} from this pocket`}
          className="absolute top-0.5 right-0.5 z-10 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-80 transition-opacity hover:opacity-100 focus-visible:opacity-100 sm:size-4"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}
