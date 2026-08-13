"use client";

import { Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * v1 ships dark-only (see globals.css). The toggle stays visible for header
 * parity with the real app, but is a no-op with a "coming soon" tooltip
 * until a real light palette is built.
 */
export function ThemeToggle() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Light mode (coming soon)"
        >
          <Moon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Light mode — coming soon</TooltipContent>
    </Tooltip>
  );
}
