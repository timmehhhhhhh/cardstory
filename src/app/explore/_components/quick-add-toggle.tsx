"use client";

import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePCStore } from "@/lib/pc/store";

/**
 * Explore control: while on (and businessMode is off), a card's add-to-PC
 * click skips AddHoldingDialog and adds straight into the active PC with
 * default values, mirroring Business Mode's own forced-PC bypass — see
 * card-tile.tsx, which is where the actual skip-the-dialog behavior lives.
 * Available to everyone (unlike BusinessModeToggle, no vendor gate), but
 * inert while Business Mode is on since that's a vendor-specific forced
 * destination that takes priority.
 */
export function QuickAddToggle() {
  const quickAdd = usePCStore((s) => s.preferences.quickAdd);
  const setQuickAdd = usePCStore((s) => s.setQuickAdd);
  const businessMode = usePCStore((s) => s.preferences.businessMode);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={quickAdd}
      disabled={businessMode}
      onClick={() => setQuickAdd(!quickAdd)}
      title={
        businessMode
          ? "Quick add is disabled while Business mode is on"
          : "When on, adding a card from Explore skips the dialog and drops it straight into your active PC"
      }
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        businessMode
          ? "border-border bg-surface text-muted-foreground/50 cursor-not-allowed"
          : quickAdd
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border bg-surface text-muted-foreground hover:text-foreground"
      )}
    >
      <Zap className="size-3.5" />
      Quick add
      <span
        className={cn(
          "ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
          quickAdd && !businessMode ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        {quickAdd ? "On" : "Off"}
      </span>
    </button>
  );
}
