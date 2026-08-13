"use client";

import * as React from "react";
import { Copy, MoveRight, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePortfolioStore } from "@/lib/portfolio/store";

export function BulkActionsBar({
  activePortfolioId,
  selected,
  onClear,
}: {
  activePortfolioId: string;
  selected: Set<string>;
  onClear: () => void;
}) {
  const portfolios = usePortfolioStore((s) => s.portfolios);
  const copyHoldings = usePortfolioStore((s) => s.copyHoldings);
  const moveHoldings = usePortfolioStore((s) => s.moveHoldings);
  const removeHoldings = usePortfolioStore((s) => s.removeHoldings);

  const otherPortfolios = portfolios.filter((p) => p.id !== activePortfolioId);
  // Only tracks an explicit user pick; falls back to the first option so no
  // effect is needed to keep it in sync as `otherPortfolios` changes.
  const [explicitTarget, setExplicitTarget] = React.useState<string | null>(null);
  const target = explicitTarget && otherPortfolios.some((p) => p.id === explicitTarget)
    ? explicitTarget
    : (otherPortfolios[0]?.id ?? "");

  if (selected.size === 0) return null;
  const ids = Array.from(selected);

  return (
    <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-xl border border-primary/40 bg-surface-elevated px-4 py-3 shadow-lg">
      <span className="text-sm font-medium">{selected.size} selected</span>

      {otherPortfolios.length > 0 && (
        <>
          <Select value={target} onValueChange={setExplicitTarget}>
            <SelectTrigger size="sm" className="w-36 bg-background">
              <SelectValue placeholder="Target portfolio" />
            </SelectTrigger>
            <SelectContent>
              {otherPortfolios.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            disabled={!target}
            onClick={() => {
              copyHoldings(activePortfolioId, target, ids);
              onClear();
            }}
          >
            <Copy className="size-4" /> Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!target}
            onClick={() => {
              moveHoldings(activePortfolioId, target, ids);
              onClear();
            }}
          >
            <MoveRight className="size-4" /> Move
          </Button>
        </>
      )}

      <Button
        variant="outline"
        size="sm"
        className="border-negative/40 text-negative hover:bg-negative/10"
        onClick={() => {
          removeHoldings(activePortfolioId, ids);
          onClear();
        }}
      >
        <Trash2 className="size-4" /> Delete
      </Button>

      <button
        type="button"
        aria-label="Clear selection"
        onClick={onClear}
        className="ml-auto text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
