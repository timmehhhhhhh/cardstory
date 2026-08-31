"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SearchBox({
  inputClassName,
  triggerClassName,
  variant = "toggle",
}: {
  inputClassName?: string;
  triggerClassName?: string;
  /** "toggle" (default) collapses to an icon button until clicked, like the
   * old mobile/footer search. "inline" stays permanently expanded, styled
   * like Explore's own search field — used for the persistent desktop
   * nav-bar search so it reads as a search bar, not a hidden action. */
  variant?: "toggle" | "inline";
} = {}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(variant === "inline");
  const [value, setValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open && variant === "toggle") inputRef.current?.focus();
  }, [open, variant]);

  function submit() {
    const q = value.trim();
    router.push(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore");
    if (variant === "toggle") {
      setOpen(false);
      setValue("");
    }
  }

  if (variant === "inline") {
    return (
      <div className={cn("relative", inputClassName)}>
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Search any card or sealed product…"
          className="h-9 w-full bg-surface border-border pl-8 pr-8"
        />
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setValue("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    );
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("text-muted-foreground hover:text-foreground", triggerClassName)}
        aria-label="Search"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Search any card or product…"
        className={cn("h-9 w-40 sm:w-56 bg-surface-elevated border-border", inputClassName)}
      />
      <Button variant="ghost" size="icon" aria-label="Close search" onClick={() => setOpen(false)}>
        <X className="size-4" />
      </Button>
    </div>
  );
}
