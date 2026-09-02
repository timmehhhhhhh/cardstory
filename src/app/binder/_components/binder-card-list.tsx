"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Binder } from "@/lib/binder/types";
import type { EnrichedHolding } from "@/lib/pc/selectors";
import type { CatalogItemDetail } from "@/lib/catalog/by-ids";

interface CardListRow {
  index: number;
  name: string;
  page: number;
  row: number;
  col: number;
  notOwned: boolean;
}

function buildRows(binder: Binder, cols: number, cardsById: Map<string, EnrichedHolding>, catalogItemsById: Map<string, CatalogItemDetail>): CardListRow[] {
  const rows: CardListRow[] = [];
  binder.pages.forEach((page, pageIdx) => {
    page.pockets.forEach((ref, slotIndex) => {
      if (!ref || ref.kind === "custom-covered") return;
      const name =
        ref.kind === "holding"
          ? (cardsById.get(ref.holdingId)?.display.name ?? "Unknown card")
          : ref.kind === "catalog"
            ? (catalogItemsById.get(ref.catalogItemId)?.name ?? "Unknown card")
            : "Custom image";
      rows.push({
        index: rows.length + 1,
        name,
        page: pageIdx + 1,
        row: Math.floor(slotIndex / cols) + 1,
        col: (slotIndex % cols) + 1,
        notOwned: ref.kind === "catalog",
      });
    });
  });
  return rows;
}

function slugify(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "binder";
}

function exportCsv(binder: Binder, rows: CardListRow[]) {
  const header = ["#", "Card", "Page", "Row", "Column", "Status"];
  const lines = rows.map((r) =>
    [r.index, r.name, r.page, r.row, r.col, r.notOwned ? "Not Owned" : "Owned"]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cardstory-binder-${slugify(binder.name)}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Per-binder audit list of every placed card with its exact page/pocket position — and the one place that list can be exported, since it's otherwise only visible pocket by pocket in the spread above. */
export function BinderCardList({
  binder,
  cols,
  cardsById,
  catalogItemsById,
}: {
  binder: Binder;
  cols: number;
  cardsById: Map<string, EnrichedHolding>;
  catalogItemsById: Map<string, CatalogItemDetail>;
}) {
  const rows = buildRows(binder, cols, cardsById, catalogItemsById);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-sm font-semibold">Cards in this binder</h2>
          <p className="text-xs text-muted-foreground">
            {rows.length} card{rows.length === 1 ? "" : "s"} placed
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={rows.length === 0}
          onClick={() => exportCsv(binder, rows)}
        >
          <Download className="size-4" /> Export
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">No cards placed yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-1.5 pr-2 font-medium">#</th>
                <th className="py-1.5 pr-2 font-medium">Card</th>
                <th className="py-1.5 pr-2 font-medium">Page</th>
                <th className="py-1.5 pr-2 font-medium">Position</th>
                <th className="py-1.5 pr-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.index} className="border-b border-border/60 last:border-0">
                  <td className="num-tabular py-1.5 pr-2 text-muted-foreground">{r.index}</td>
                  <td className="py-1.5 pr-2 font-medium">{r.name}</td>
                  <td className="num-tabular py-1.5 pr-2">{r.page}</td>
                  <td className="num-tabular py-1.5 pr-2">
                    Row {r.row}, Col {r.col}
                  </td>
                  <td className="py-1.5 pr-2">
                    <Badge variant={r.notOwned ? "destructive" : "secondary"}>
                      {r.notOwned ? "Not owned" : "Owned"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
