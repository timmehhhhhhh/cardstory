"use client";

import { AddHoldingDialog } from "@/components/pc/add-holding-dialog";
import { usePCStore } from "@/lib/pc/store";
import { isItemLanguage } from "@/lib/pc/language";

export function CollectionPanel({
  catalogItemId,
  sportsCardItemId,
  cardName,
  suggestedPrice,
  language,
}: {
  catalogItemId?: string;
  sportsCardItemId?: string;
  cardName: string;
  suggestedPrice: number | null;
  /** CatalogItem.language, e.g. "JP" — pre-selects Add to PC's Language field. */
  language?: string;
}) {
  const ownedQuantity = usePCStore((s) => {
    const active = s.pcs.find((p) => p.id === s.activePCId);
    return active?.holdings
      .filter(
        (h) =>
          (catalogItemId && h.catalogItemId === catalogItemId) ||
          (sportsCardItemId && h.sportsCardItemId === sportsCardItemId)
      )
      .reduce((sum, h) => sum + h.quantity, 0);
  });

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold">Collection</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        {ownedQuantity ? `You own ${ownedQuantity} in your active pc.` : "Track this card in your collection."}
      </p>
      <AddHoldingDialog
        catalogItemId={catalogItemId}
        sportsCardItemId={sportsCardItemId}
        cardName={cardName}
        suggestedPrice={suggestedPrice}
        defaultLanguage={isItemLanguage(language) ? language : undefined}
      />
    </div>
  );
}
