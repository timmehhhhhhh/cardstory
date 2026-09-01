"use client";

import { GripVertical, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardNumberBadge } from "@/components/cards/card-number-badge";
import { Badge } from "@/components/ui/badge";
import { CardImage } from "@/components/cards/card-image";
import { withEnglishName } from "@/lib/catalog/card-name";

/** A pocket's resolved display data — built by BinderPageView from either an owned holding or a catalog-only ("not owned") reference, so BinderPocket itself never needs to know which. */
export interface PocketCard {
  name: string;
  nameEn: string | null;
  number: string | null;
  imageUrl: string | null;
  /** True when this card was placed from the picker's "Not Owned" tab, i.e. there's no backing Holding in the pc. */
  notOwned: boolean;
}

export function BinderPocket({
  card,
  selected,
  draggedOver,
  showNumberTag,
  showNotOwnedTag,
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
  /** Whether to show the "Not owned" tag on catalog-only pockets. */
  showNotOwnedTag: boolean;
  onSelect: () => void;
  onClear: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const filled = !!card;

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "group/pocket relative aspect-[5/7] w-full overflow-hidden rounded-[3px] bg-black/15 ring-1 ring-inset ring-black/10 transition-shadow dark:bg-black/25",
        selected && "ring-2 ring-primary ring-offset-1 ring-offset-surface-elevated",
        draggedOver && "ring-2 ring-primary/70"
      )}
    >
      {filled ? (
        <button
          type="button"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onClick={onSelect}
          aria-label={`${withEnglishName(card.name, card.nameEn)} — click to swap`}
          className="absolute inset-0 flex size-full cursor-grab flex-col items-stretch justify-center active:cursor-grabbing"
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
          />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/70 to-transparent py-1 opacity-0 transition-opacity group-hover/pocket:opacity-100">
            <GripVertical className="size-3 text-white/80" />
          </span>
        </button>
      ) : (
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
      )}

      {filled && showNumberTag && <CardNumberBadge number={card.number} variant="overlay" />}

      {filled && card.notOwned && showNotOwnedTag && (
        <Badge
          variant="destructive"
          className="absolute bottom-0.5 left-0.5 z-10 h-auto px-1 py-0 text-[9px] leading-tight"
        >
          Not owned
        </Badge>
      )}

      {filled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          aria-label={`Remove ${withEnglishName(card.name, card.nameEn)} from this pocket`}
          className="absolute top-0.5 right-0.5 z-10 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-80 transition-opacity hover:opacity-100 focus-visible:opacity-100 sm:size-4"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}
