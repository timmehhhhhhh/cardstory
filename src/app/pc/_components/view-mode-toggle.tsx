"use client";

import { LayoutGrid, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePCStore } from "@/lib/pc/store";
import type { ViewMode } from "@/lib/pc/types";

/**
 * Switches the holdings area between the detail-dense list (ItemGrid) and
 * the image-first gallery (ItemGallery).
 *
 * The choice is stored in Preferences.viewMode rather than per-page state,
 * so it's one preference shared by /pc and /business — a collector who
 * prefers card art gets it in both places, and it survives a reload.
 */
export function ViewModeToggle() {
  const viewMode = usePCStore((s) => s.preferences.viewMode);
  const setViewMode = usePCStore((s) => s.setViewMode);

  const options: { value: ViewMode; label: string; icon: typeof Rows3 }[] = [
    { value: "list", label: "List", icon: Rows3 },
    { value: "grid", label: "Gallery", icon: LayoutGrid },
  ];

  return (
    <div
      role="group"
      aria-label="View mode"
      className="flex items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={viewMode === o.value}
          onClick={() => setViewMode(o.value)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm",
            viewMode === o.value
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
          )}
        >
          <o.icon className="size-4" /> {o.label}
        </button>
      ))}
    </div>
  );
}
