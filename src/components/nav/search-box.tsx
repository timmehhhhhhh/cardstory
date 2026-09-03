"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildSetSearchHref } from "@/lib/explore/set-search-href";
import type { SetNameMatch } from "@/lib/catalog/search";

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
  const [setMatches, setSetMatches] = React.useState<SetNameMatch[] | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open && variant === "toggle") inputRef.current?.focus();
  }, [open, variant]);

  function goToSet(match: SetNameMatch) {
    setSetMatches(null);
    router.push(buildSetSearchHref(match.gameId, match.setId));
    if (variant === "toggle") {
      setOpen(false);
      setValue("");
    }
  }

  async function submit() {
    const q = value.trim();
    if (!q) {
      router.push("/explore");
      if (variant === "toggle") setOpen(false);
      return;
    }
    // If the typed text names a set (e.g. "Pitch Black"), jump straight to
    // that set's cards on Explore instead of falling through to the plain
    // free-text card search, which doesn't match set names for TCG rows —
    // see findSetsByName in lib/catalog/search.ts.
    try {
      const res = await fetch(`/api/catalog/sets/by-name?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const { matches } = (await res.json()) as { matches: SetNameMatch[] };
        if (matches.length === 1) {
          goToSet(matches[0]);
          return;
        }
        if (matches.length > 1) {
          setSetMatches(matches);
          return;
        }
      }
    } catch {
      // Lookup failing shouldn't block a normal search — fall through.
    }
    router.push(`/explore?q=${encodeURIComponent(q)}`);
    if (variant === "toggle") {
      setOpen(false);
      setValue("");
    }
  }

  // Shown when the typed text matches sets in more than one game — lets the
  // user pick which one they meant rather than guessing.
  const disambiguation = setMatches && setMatches.length > 0 && (
    <div
      role="listbox"
      aria-label="Choose a set"
      className="absolute inset-x-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-surface-elevated py-1 shadow-lg"
    >
      {setMatches.map((m) => (
        <button
          key={`${m.gameId}:${m.setId}`}
          type="button"
          role="option"
          onClick={() => goToSet(m)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surface"
        >
          <span className="truncate">{m.setName}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{m.gameName}</span>
        </button>
      ))}
    </div>
  );

  if (variant === "inline") {
    return (
      <div className={cn("relative", inputClassName)}>
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSetMatches(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") setSetMatches(null);
          }}
          placeholder="Search any card or sealed product…"
          className="h-9 w-full bg-surface border-border pl-8 pr-8"
        />
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setValue("");
              setSetMatches(null);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
        {disambiguation}
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
    <div className="relative flex items-center gap-1">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSetMatches(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setSetMatches(null);
            setOpen(false);
          }
        }}
        placeholder="Search any card or product…"
        className={cn("h-9 w-40 sm:w-56 bg-surface-elevated border-border", inputClassName)}
      />
      <Button
        variant="ghost"
        size="icon"
        aria-label="Close search"
        onClick={() => {
          setSetMatches(null);
          setOpen(false);
        }}
      >
        <X className="size-4" />
      </Button>
      {disambiguation}
    </div>
  );
}
