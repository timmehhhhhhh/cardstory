"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { BinderPage } from "@/lib/binder/types";

export function BinderPageNav({
  pages,
  visiblePageNumbers,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onJumpToPage,
  onAddPage,
}: {
  pages: BinderPage[];
  /** 1-based page numbers currently shown (e.g. [1] or [2, 3]) — drives which thumbnail(s) highlight. Pairing-agnostic on purpose: the caller decides how pages group into spreads (see bookSpreads). */
  visiblePageNumbers: number[];
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onJumpToPage: (pageNumber: number) => void;
  onAddPage: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={!canPrev} onClick={onPrev}>
        <ChevronLeft className="size-4" />
      </Button>

      <div className="flex max-w-[min(60vw,20rem)] items-center gap-1 overflow-x-auto no-scrollbar">
        {pages.map((page, i) => {
          const pageNumber = i + 1;
          const active = visiblePageNumbers.includes(pageNumber);
          return (
            <button
              key={page.id}
              type="button"
              onClick={() => onJumpToPage(pageNumber)}
              aria-label={`Go to page ${pageNumber}`}
              aria-current={active}
              className={cn(
                "flex size-7 flex-none items-center justify-center rounded-md text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
              )}
            >
              {pageNumber}
            </button>
          );
        })}
      </div>

      <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={!canNext} onClick={onNext}>
        <ChevronRight className="size-4" />
      </Button>

      <Button variant="ghost" size="sm" onClick={onAddPage} className="ml-1">
        <Plus className="size-3.5" />
        Add page
      </Button>
    </div>
  );
}
