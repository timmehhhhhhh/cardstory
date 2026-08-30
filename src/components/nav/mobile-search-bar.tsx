"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Mobile-only relocation of the top nav's search control — a floating pill
 * pinned near the bottom of the screen (roughly where a mobile OS's own
 * search bar sits), so search stays reachable with one thumb instead of
 * competing for space in the cramped mobile top nav. Desktop/tablet keep
 * SearchBox in the top nav (see top-nav.tsx); this is `md:hidden`.
 */
export function MobileSearchBar() {
  const router = useRouter();
  const [value, setValue] = React.useState("");

  function submit() {
    const q = value.trim();
    router.push(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore");
    setValue("");
  }

  return (
    <div className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 md:hidden">
      <div className="flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-4 py-2.5 shadow-lg">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Search any card or product…"
          aria-label="Search"
          className="h-auto min-w-0 border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
        />
      </div>
    </div>
  );
}
