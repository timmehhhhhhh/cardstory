"use client";

import * as React from "react";
import { Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { AddHoldingDialog } from "@/components/pc/add-holding-dialog";
import { EditHoldingDialog } from "@/components/pc/edit-holding-dialog";
import { usePCStore } from "@/lib/pc/store";
import { usePCData } from "@/hooks/use-pc-data";
import { isItemLanguage } from "@/lib/pc/language";
import { CARD_CONDITION_LABELS } from "@/lib/constants";
import type { EnrichedHolding } from "@/lib/pc/selectors";

/** "1x Raw · Excellent · EN" / "2x Graded PSA 10 · JP" — a compact summary of one owned holding's identifying attributes. */
function holdingSummary(h: EnrichedHolding): string {
  const conditionBit =
    h.condition === "graded"
      ? `Graded${h.gradeCompany ? ` ${h.gradeCompany}` : ""}${h.gradeValue ? ` ${h.gradeValue}` : ""}`
      : h.condition === "sealed"
        ? "Sealed"
        : `Raw${h.rawCondition ? ` · ${CARD_CONDITION_LABELS[h.rawCondition]}` : ""}`;
  return `${h.quantity}× ${conditionBit} · ${h.language}`;
}

export function CollectionPanel({
  catalogItemId,
  sportsCardItemId,
  cardName,
  suggestedPrice,
  language,
  pcId: pcIdProp,
  heading = "Collection",
  emptyText = "Track this card in your collection.",
}: {
  catalogItemId?: string;
  sportsCardItemId?: string;
  cardName: string;
  suggestedPrice: number | null;
  /** CatalogItem.language, e.g. "JP" — pre-selects Add to PC's Language field. */
  language?: string;
  /**
   * Scopes this panel to a specific pc instead of the globally active one —
   * used by BusinessHoldingsPanel to point this same component at the
   * Business Inventory pc. Defaults to the active pc, preserving this
   * component's original behavior when omitted.
   */
  pcId?: string;
  /** Panel heading and Add dialog title — e.g. "Business Inventory". */
  heading?: string;
  /** Shown under the heading when nothing is owned yet. */
  emptyText?: string;
}) {
  const activePCId = usePCStore((s) => s.activePCId);
  const pcId = pcIdProp ?? activePCId;
  const archiveHoldings = usePCStore((s) => s.archiveHoldings);
  const updateHolding = usePCStore((s) => s.updateHolding);
  // Same enrichment usePC's own list uses (see pc-client.tsx) — gives each
  // matching holding its resolved display name/unitPrice/etc, which is what
  // EditHoldingDialog needs, rather than a bare Holding row. Scoped to
  // `pcId`, not necessarily the active pc — see usePCData's pcIdOverride.
  const { rows } = usePCData(pcId);

  const ownedHoldings = React.useMemo(
    () =>
      rows.filter(
        (h) =>
          (catalogItemId && h.catalogItemId === catalogItemId) ||
          (sportsCardItemId && h.sportsCardItemId === sportsCardItemId)
      ),
    [rows, catalogItemId, sportsCardItemId]
  );
  const ownedQuantity = ownedHoldings.reduce((sum, h) => sum + h.quantity, 0);

  const [editingHolding, setEditingHolding] = React.useState<EnrichedHolding | null>(null);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold">{heading}</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        {ownedQuantity ? `You own ${ownedQuantity} in ${heading === "Collection" ? "your active pc" : heading}.` : emptyText}
      </p>

      {ownedHoldings.length > 0 && (
        <ul className="mb-3 flex flex-col gap-1.5">
          {ownedHoldings.map((h) => (
            <li
              key={h.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm"
            >
              <span className="min-w-0 truncate">{holdingSummary(h)}</span>
              <span className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  title="Decrease quantity"
                  onClick={() => updateHolding(pcId, h.id, { quantity: Math.max(1, h.quantity - 1) })}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Minus className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  title="Increase quantity"
                  onClick={() => updateHolding(pcId, h.id, { quantity: h.quantity + 1 })}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Plus className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Edit this holding"
                  title="Edit"
                  onClick={() => setEditingHolding(h)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Remove this holding from your PC"
                  title="Remove from PC"
                  onClick={() => archiveHoldings(pcId, [h.id])}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-negative"
                >
                  <Trash2 className="size-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <AddHoldingDialog
        catalogItemId={catalogItemId}
        sportsCardItemId={sportsCardItemId}
        cardName={cardName}
        suggestedPrice={suggestedPrice}
        defaultLanguage={isItemLanguage(language) ? language : undefined}
        forcedPCId={pcId}
        title={`Add to ${heading}`}
      />

      <EditHoldingDialog
        holding={editingHolding}
        pcId={pcId}
        open={editingHolding != null}
        onOpenChange={(open) => {
          if (!open) setEditingHolding(null);
        }}
      />
    </div>
  );
}
