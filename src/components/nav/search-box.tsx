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
}: { inputClassName?: string; triggerClassName?: string } = {}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function submit() {
    const q = value.trim();
    router.push(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore");
    setOpen(false);
    setValue("");
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
