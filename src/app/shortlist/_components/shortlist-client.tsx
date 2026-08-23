"use client";

import * as React from "react";
import { ShoppingBag } from "lucide-react";
import { useShortlistData } from "@/hooks/use-shortlist-data";
import { ShortlistAddBar } from "@/app/shortlist/_components/shortlist-add-bar";
import { ShortlistStackedRows } from "@/app/shortlist/_components/shortlist-row";
import { ShortlistCheckoutBar } from "@/app/shortlist/_components/shortlist-checkout-bar";
import { ShortlistCheckoutDialog } from "@/app/shortlist/_components/shortlist-checkout-dialog";
import { computeShortlistTotals } from "@/lib/shortlist/selectors";

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-16 text-center">
      <ShoppingBag className="mb-2 size-6 text-muted-foreground" aria-hidden />
      <p className="font-medium">Nothing shortlisted yet</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Spotted something at a shop? Search for it or key it in above, note the asking price, and decide later.
      </p>
    </div>
  );
}

export function ShortlistClient() {
  const { rows, totals } = useShortlistData();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [focusId, setFocusId] = React.useState<string | null>(null);

  // Drop any selected id that no longer exists (deleted, or just checked
  // out) — adjusted during render rather than an effect, same "compare a
  // stable primitive, not a freshly-constructed object" pattern as
  // pc-client.tsx's activePCId tracking. A Set is a new object every render
  // regardless of content, so comparing Set identity here would never
  // settle — the joined-ids string is what actually stays stable when
  // nothing has changed.
  const rowIdsKey = rows.map((r) => r.id).join(",");
  const [prevRowIdsKey, setPrevRowIdsKey] = React.useState(rowIdsKey);
  if (rowIdsKey !== prevRowIdsKey) {
    setPrevRowIdsKey(rowIdsKey);
    const rowIdSet = new Set(rows.map((r) => r.id));
    const pruned = Array.from(selected).filter((id) => rowIdSet.has(id));
    if (pruned.length !== selected.size) setSelected(new Set(pruned));
  }

  function toggle(id: string, isSelected: boolean) {
    setSelected((s) => {
      const next = new Set(s);
      if (isSelected) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const selectedRows = rows.filter((r) => selected.has(r.id));
  const selectedTotals = computeShortlistTotals(selectedRows);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold">In-Store Shortlist</h1>
        <p className="text-sm text-muted-foreground">
          Park cards you&apos;re weighing up while you shop. Nothing here counts as owned until you check it out.
        </p>
      </div>

      <ShortlistAddBar onAdded={(id) => setFocusId(id)} />

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
            <span>
              {totals.itemCount} item{totals.itemCount === 1 ? "" : "s"} · {totals.cardCount} card
              {totals.cardCount === 1 ? "" : "s"}
            </span>
          </div>
          <ShortlistStackedRows
            rows={rows}
            selected={selected}
            onToggleSelected={toggle}
            focusId={focusId}
          />
        </div>
      )}

      <ShortlistCheckoutBar
        totals={selectedTotals}
        allSelected={selected.size === rows.length && rows.length > 0}
        onSelectAll={() => setSelected(new Set(rows.map((r) => r.id)))}
        onClear={() => setSelected(new Set())}
        onCheckout={() => setCheckoutOpen(true)}
      />

      <ShortlistCheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        rows={selectedRows}
        onDone={(succeededIds) => {
          setSelected((s) => {
            const next = new Set(s);
            for (const id of succeededIds) next.delete(id);
            return next;
          });
        }}
      />
    </div>
  );
}
