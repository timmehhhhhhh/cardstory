"use client";

import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

export function ViewToggle({
  value,
  onChange,
}: {
  value: "grid" | "list";
  onChange: (view: "grid" | "list") => void;
}) {
  return (
    <div className="flex items-center rounded-md border border-border bg-surface p-0.5">
      {(
        [
          { key: "grid", icon: LayoutGrid, label: "Grid view" },
          { key: "list", icon: List, label: "List view" },
        ] as const
      ).map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          type="button"
          aria-label={label}
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
