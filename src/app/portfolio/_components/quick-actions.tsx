"use client";

import Link from "next/link";
import { CheckSquare, Download, LineChart, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EnrichedHolding } from "@/lib/portfolio/selectors";

function exportCsv(rows: EnrichedHolding[]) {
  const header = [
    "Name",
    "Game",
    "Quantity",
    "Condition",
    "Grade",
    "Language",
    "Cost Basis (USD)",
    "Market Value (USD)",
    "Gain/Loss (USD)",
    "Acquired",
  ];
  const lines = rows.map((r) =>
    [
      r.catalogItem?.name ?? r.catalogItemId,
      r.catalogItem?.gameId ?? "",
      r.quantity,
      r.condition,
      r.condition === "graded" ? `${r.gradeCompany ?? ""} ${r.gradeValue ?? ""}`.trim() : "",
      r.language,
      r.costBasisTotal.toFixed(2),
      r.marketValue.toFixed(2),
      r.gainLoss.toFixed(2),
      r.acquiredAt.slice(0, 10),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cardstory-portfolio-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function QuickActions({
  rows,
  bulkMode,
  onToggleBulkMode,
}: {
  rows: EnrichedHolding[];
  bulkMode: boolean;
  onToggleBulkMode: () => void;
}) {
  const actions = [
    { key: "movers", label: "Market Movers", icon: LineChart, href: "/explore?sort=trending_up" },
    { key: "trade", label: "Trade Analyzer", icon: Repeat, href: "/trade-analyzer" },
  ] as const;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((a) => (
        <Link
          key={a.key}
          href={a.href}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
        >
          <a.icon className="size-4" /> {a.label}
        </Link>
      ))}
      <button
        type="button"
        onClick={onToggleBulkMode}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm",
          bulkMode
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border bg-surface text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
        )}
      >
        <CheckSquare className="size-4" /> Bulk Actions
      </button>
      <button
        type="button"
        onClick={() => exportCsv(rows)}
        disabled={rows.length === 0}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-muted-foreground hover:bg-surface-elevated hover:text-foreground disabled:opacity-40"
      >
        <Download className="size-4" /> Export
      </button>
    </div>
  );
}
