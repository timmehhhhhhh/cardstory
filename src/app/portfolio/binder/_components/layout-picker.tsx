"use client";

import { cn } from "@/lib/utils";
import { BINDER_LAYOUT_IDS, BINDER_LAYOUTS, type BinderLayoutId } from "@/lib/binder/types";

/** Tiny rows×cols preview so users can see the pocket shape before picking it. */
function LayoutPreview({ rows, cols, active }: { rows: number; cols: number; active: boolean }) {
  return (
    <div
      className="grid gap-[3px]"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: rows * cols }, (_, i) => (
        <div
          key={i}
          className={cn(
            "aspect-[5/7] w-2 rounded-[1.5px] sm:w-2.5",
            active ? "bg-primary-foreground/70" : "bg-muted-foreground/40"
          )}
        />
      ))}
    </div>
  );
}

export function LayoutPicker({
  value,
  onChange,
}: {
  value: BinderLayoutId;
  onChange: (layoutId: BinderLayoutId) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {BINDER_LAYOUT_IDS.map((layoutId) => {
        const layout = BINDER_LAYOUTS[layoutId];
        const active = layoutId === value;
        return (
          <button
            key={layoutId}
            type="button"
            onClick={() => onChange(layoutId)}
            aria-pressed={active}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border px-2 py-3 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            <LayoutPreview rows={layout.rows} cols={layout.cols} active={active} />
            {layout.label}
          </button>
        );
      })}
    </div>
  );
}
