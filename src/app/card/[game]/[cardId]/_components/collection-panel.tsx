"use client";

import { AddHoldingDialog } from "@/components/portfolio/add-holding-dialog";
import { usePortfolioStore } from "@/lib/portfolio/store";

export function CollectionPanel({
  catalogItemId,
  sportsCardItemId,
  cardName,
  suggestedPrice,
}: {
  catalogItemId?: string;
  sportsCardItemId?: string;
  cardName: string;
  suggestedPrice: number | null;
}) {
  const ownedQuantity = usePortfolioStore((s) => {
    const active = s.portfolios.find((p) => p.id === s.activePortfolioId);
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
        {ownedQuantity ? `You own ${ownedQuantity} in your active portfolio.` : "Track this card in your collection."}
      </p>
      <AddHoldingDialog
        catalogItemId={catalogItemId}
        sportsCardItemId={sportsCardItemId}
        cardName={cardName}
        suggestedPrice={suggestedPrice}
      />
    </div>
  );
}
