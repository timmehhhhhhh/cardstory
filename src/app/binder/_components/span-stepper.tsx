"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Plus/minus stepper for a custom image's pocket span (cols or rows), clamped to [1, max]. Shared by the initial-placement flow (custom-image-upload.tsx) and the resize dialog (custom-image-resize-dialog.tsx). */
export function SpanStepper({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={value <= 1}
          onClick={() => onChange(Math.max(1, value - 1))}
        >
          <Minus className="size-3.5" />
        </Button>
        <span className="num-tabular w-6 text-center text-sm">{value}</span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
