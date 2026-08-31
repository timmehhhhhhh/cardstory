"use client";

import { Grid2x2, Grid3x3, List } from "lucide-react";
import { cn } from "@/lib/utils";

type ExploreView = "grid2" | "grid3" | "list";

export function ViewToggle({
  value,
  onChange,
}: {
  value: ExploreView;
  onChange: (view: ExploreView) => void;
}) {
  return (
    <div className="flex items-center rounded-md border border-border bg-surface p-0.5">
      {(
        [
          { key: "grid2", icon: Grid2x2, label: "2 per row" },
          { key: "grid3", icon: Grid3x3, label: "3 per row" },
          { key: "list", icon: List, label: "List view" },
        ] as const
      ).map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          type="button"
          aria-label={label}
          title={label}
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={cn(
            "flex size-7 items-center justify-center rounded",
            value === key
              ? "bg-surface-elevated text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
