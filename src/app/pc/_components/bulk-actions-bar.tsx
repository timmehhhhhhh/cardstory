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
import { usePCStore } from "@/lib/pc/store";

export function BulkActionsBar({
  activePCId,
  selected,
  onClear,
}: {
  activePCId: string;
  selected: Set<string>;
  onClear: () => void;
}) {
  const pcs = usePCStore((s) => s.pcs);
  const copyHoldings = usePCStore((s) => s.copyHoldings);
  const moveHoldings = usePCStore((s) => s.moveHoldings);
  const removeHoldings = usePCStore((s) => s.removeHoldings);

  const otherPCs = pcs.filter((p) => p.id !== activePCId);
  // Only tracks an explicit user pick; falls back to the first option so no
  // effect is needed to keep it in sync as `otherPCs` changes.
  const [explicitTarget, setExplicitTarget] = React.useState<string | null>(null);
  const target = explicitTarget && otherPCs.some((p) => p.id === explicitTarget)
    ? explicitTarget
    : (otherPCs[0]?.id ?? "");

  if (selected.size === 0) return null;
  const ids = Array.from(selected);

  return (
    <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-xl border border-primary/40 bg-surface-elevated px-4 py-3 shadow-lg">
      <span className="text-sm font-medium">{selected.size} selected</span>

      {otherPCs.length > 0 && (
        <>
          <Select value={target} onValueChange={setExplicitTarget}>
            <SelectTrigger size="sm" className="w-36 bg-background">
              <SelectValue placeholder="Target PC" />
            </SelectTrigger>
            <SelectContent>
              {otherPCs.map((p) => (
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
              copyHoldings(activePCId, target, ids);
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
              moveHoldings(activePCId, target, ids);
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
          removeHoldings(activePCId, ids);
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
