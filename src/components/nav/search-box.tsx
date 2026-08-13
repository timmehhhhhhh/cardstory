"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SearchBox() {
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
        className="text-muted-foreground hover:text-foreground"
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
        className="h-9 w-40 sm:w-56 bg-surface-elevated border-border"
      />
      <Button variant="ghost" size="icon" aria-label="Close search" onClick={() => setOpen(false)}>
        <X className="size-4" />
      </Button>
    </div>
  );
}
