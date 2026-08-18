"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { BinderPage } from "@/lib/binder/types";

export function BinderPageNav({
  pages,
  cursor,
  step,
  onJump,
  onAddPage,
}: {
  pages: BinderPage[];
  cursor: number;
  step: 1 | 2;
  onJump: (pageIndex: number) => void;
  onAddPage: () => void;
}) {
  const canPrev = cursor > 0;
  const canNext = cursor + step < pages.length;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Previous page"
        disabled={!canPrev}
        onClick={() => onJump(Math.max(0, cursor - step))}
      >
        <ChevronLeft className="size-4" />
      </Button>

      <div className="flex max-w-[min(60vw,20rem)] items-center gap-1 overflow-x-auto no-scrollbar">
        {pages.map((page, i) => {
          const active = i === cursor || (step === 2 && i === cursor + 1);
          return (
            <button
              key={page.id}
              type="button"
              onClick={() => onJump(step === 2 ? i - (i % 2) : i)}
              aria-label={`Go to page ${i + 1}`}
              aria-current={active}
              className={cn(
                "flex size-7 flex-none items-center justify-center rounded-md text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Next page"
        disabled={!canNext}
        onClick={() => onJump(Math.min(pages.length - step, cursor + step))}
      >
        <ChevronRight className="size-4" />
      </Button>

      <Button variant="ghost" size="sm" onClick={onAddPage} className="ml-1">
        <Plus className="size-3.5" />
        Add page
      </Button>
    </div>
  );
}
