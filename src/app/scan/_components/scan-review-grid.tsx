"use client";

import { ScanResultCard } from "@/app/scan/_components/scan-result-card";
import { DetectedCardsOverlay } from "@/app/scan/_components/detected-cards-overlay";
import type { ReviewItem } from "@/lib/scan-cards/review-state";
import { usePCStore } from "@/lib/pc/store";
import { computeOwnedQuantity } from "@/lib/pc/selectors";
import { getGameMeta } from "@/lib/games/registry";

/**
 * Groups a flat ReviewItem[] back by source photo (for the numbered overlay
 * headers) while still rendering every card in one flat grid below — the
 * overlay is "where in the photo," the grid is "review every card," and
 * both stay in the engine's own reading order.
 */
function groupBySourceImage(items: ReviewItem[]): { sourceImageId: string; previewUrl: string; items: ReviewItem[] }[] {
  const groups: { sourceImageId: string; previewUrl: string; items: ReviewItem[] }[] = [];
  for (const item of items) {
    const existing = groups.find((g) => g.sourceImageId === item.sourceImageId);
    if (existing) existing.items.push(item);
    else groups.push({ sourceImageId: item.sourceImageId, previewUrl: item.sourcePreviewUrl, items: [item] });
  }
  return groups;
}

export function ScanReviewGrid({
  items,
  retryingKeys,
  onToggleInclude,
  onSkip,
  onUnskip,
  onChangeCard,
  onRetry,
}: {
  items: ReviewItem[];
  retryingKeys: Set<string>;
  onToggleInclude: (key: string) => void;
  onSkip: (key: string) => void;
  onUnskip: (key: string) => void;
  onChangeCard: (key: string) => void;
  onRetry: (key: string) => void;
}) {
  const pcs = usePCStore((s) => s.pcs);
  const groups = groupBySourceImage(items);

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <div key={group.sourceImageId} className="flex flex-col gap-4">
          <DetectedCardsOverlay
            previewUrl={group.previewUrl}
            cards={group.items.map((i) => i.card)}
            className="max-w-xs"
          />
          {group.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cards detected in this photo.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => {
                const globalIndex = items.indexOf(item);
                const selected = item.card.candidates.find(
                  (c) => c.catalogItemId === item.card.selectedCandidateId
                );
                const isSports = selected ? getGameMeta(selected.gameId)?.kind === "sports" : false;
                const ownedQuantity = selected
                  ? computeOwnedQuantity(pcs, {
                      catalogItemId: isSports ? undefined : selected.catalogItemId,
                      sportsCardItemId: isSports ? selected.catalogItemId : undefined,
                      isSports,
                    })
                  : 0;

                return (
                  <ScanResultCard
                    key={item.key}
                    item={item}
                    index={globalIndex}
                    ownedQuantity={ownedQuantity}
                    retrying={retryingKeys.has(item.key)}
                    onToggleInclude={() => onToggleInclude(item.key)}
                    onSkip={() => onSkip(item.key)}
                    onUnskip={() => onUnskip(item.key)}
                    onChangeCard={() => onChangeCard(item.key)}
                    onRetry={() => onRetry(item.key)}
                  />
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
