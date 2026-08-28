"use client";

import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PagePlacement } from "@/lib/binder-import/types";

/**
 * Blocking modal for pockets whose target position already holds a card in
 * the live binder (see session-state.ts's detectBinderConflicts, run
 * against the live binder — not a stale session snapshot — right before
 * commit). Every conflicting pocket must be explicitly resolved
 * (keep/replace) before "Confirm page" proceeds — never silently
 * overwritten, per the spec.
 */
export function PocketConflictDialog({
  open,
  onOpenChange,
  conflicts,
  onResolve,
  onCancelImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: PagePlacement[];
  onResolve: (pocketIndex: number, resolution: "keep" | "replace") => void;
  onCancelImport: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-negative" /> Pockets already have cards
          </DialogTitle>
          <DialogDescription>
            These pockets already hold a card in this binder. Choose what to do with each before continuing.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {conflicts.map((c) => (
            <div
              key={c.pocketIndex}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">Pocket {c.pocketIndex + 1}</p>
                <p className="text-xs text-muted-foreground">
                  {c.conflictResolution
                    ? c.conflictResolution === "keep"
                      ? "Keeping existing card"
                      : "Will replace existing card"
                    : "This pocket already has a card."}
                </p>
              </div>
              <div className="flex flex-none gap-1.5">
                <Button
                  size="sm"
                  variant={c.conflictResolution === "keep" ? "default" : "outline"}
                  onClick={() => onResolve(c.pocketIndex, "keep")}
                >
                  Keep existing
                </Button>
                <Button
                  size="sm"
                  variant={c.conflictResolution === "replace" ? "default" : "outline"}
                  onClick={() => onResolve(c.pocketIndex, "replace")}
                >
                  Replace
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onCancelImport}>
            Cancel import
          </Button>
          <Button
            disabled={conflicts.some((c) => !c.conflictResolution)}
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
