"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Mic, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSpeechDictation } from "@/hooks/use-speech-dictation";
import type { CatalogSearchItem } from "@/lib/catalog/search";

const RECENT_SEARCHES_KEY = "cardstory:mobile-search:recent";
const MAX_RECENT = 8;

function readRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function pushRecentSearch(query: string) {
  const existing = readRecentSearches().filter((q) => q.toLowerCase() !== query.toLowerCase());
  const next = [query, ...existing].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch {
    // Storage full/unavailable — recent searches are a convenience, not critical.
  }
}

interface SportsCandidate {
  id: string;
  name: string;
  consoleName: string;
}

/**
 * Full-screen mobile search — opened from BottomNav's circular Search
 * button. Combines a plain text field with a dictation ("mic") toggle and a
 * live name-suggestions list drawn from both the TCG catalog and sports
 * card search endpoints, which doubles as the accuracy aid for dictation:
 * the Web Speech API has no cross-browser way to bias recognition toward a
 * custom vocabulary, so instead the recognized (possibly mangled) text
 * drives the same debounced suggestions query as typing does, and the user
 * taps the correct card/player name to confirm it.
 */
export function MobileSearchSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [recent, setRecent] = React.useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dictation = useSpeechDictation();

  // The sheet is `fixed`, which anchors to the *layout* viewport — on iOS
  // that stays full-height even once the keyboard opens, while the mobile
  // browser only scrolls/resizes the *visual* viewport to keep the focused
  // input on screen. Left alone, that desyncs the fixed sheet from what's
  // actually visible: the header and "Recent searches" list can end up
  // scrolled out of view above the visible area, or the input bar pushed
  // below it. Tracking `visualViewport` and applying its offset/height
  // directly keeps the whole sheet matched to the visible area at all times.
  const [viewport, setViewport] = React.useState<{ top: number; height: number } | null>(null);
  React.useEffect(() => {
    const vv = window.visualViewport;
    // No reset-to-null on close: the sheet is unmounted/hidden while
    // closed, so a stale value just gets overwritten by `update()` the
    // next time it opens — nothing to clean up in the meantime.
    if (!open || !vv) return;
    const update = () => setViewport({ top: vv.offsetTop, height: vv.height });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [open]);

  React.useEffect(() => {
    if (open) {
      // Deferred (not called synchronously in the effect body) — matches
      // the pattern in src/components/auth/pc-import-prompt.tsx for
      // reacting to state external to React (localStorage) on open.
      const t = setTimeout(() => {
        setRecent(readRecentSearches());
        // Autofocus without stealing focus mid-slide-in animation.
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setValue("");
      setDebounced("");
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 250);
    return () => clearTimeout(t);
  }, [value]);

  // While dictating, the interim/final transcript drives the field live —
  // same debounced-suggestions path as typing.
  React.useEffect(() => {
    if (!dictation.listening && !dictation.transcript) return;
    const t = setTimeout(() => setValue(dictation.transcript), 0);
    return () => clearTimeout(t);
  }, [dictation.transcript, dictation.listening]);

  const catalogQuery = useQuery<{ items: CatalogSearchItem[] }>({
    queryKey: ["mobile-search-catalog", debounced],
    queryFn: async () => {
      const res = await fetch(`/api/catalog/search?q=${encodeURIComponent(debounced)}&pageSize=6`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: debounced.trim().length > 1,
  });

  const sportsQuery = useQuery<{ available: boolean; candidates: SportsCandidate[] }>({
    queryKey: ["mobile-search-sports", debounced],
    queryFn: async () => {
      const res = await fetch(`/api/sportscards/search?q=${encodeURIComponent(debounced)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: debounced.trim().length > 1,
  });

  const suggestions = React.useMemo(() => {
    const names = new Set<string>();
    for (const item of catalogQuery.data?.items ?? []) {
      names.add(item.name);
      if (item.nameEn) names.add(item.nameEn);
    }
    for (const c of sportsQuery.data?.candidates ?? []) {
      if (c.name) names.add(c.name);
    }
    return Array.from(names).slice(0, 8);
  }, [catalogQuery.data, sportsQuery.data]);

  const isSearching = debounced.trim().length > 1;
  const loading = isSearching && (catalogQuery.isLoading || sportsQuery.isLoading);

  function submit(query: string) {
    const q = query.trim();
    dictation.stop();
    if (q) pushRecentSearch(q);
    router.push(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore");
    onOpenChange(false);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background md:hidden data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content
          className="fixed inset-x-0 top-0 z-50 flex h-dvh flex-col bg-background outline-none md:hidden data-open:animate-in data-open:slide-in-from-bottom-10 data-closed:animate-out data-closed:slide-out-to-bottom-10"
          style={viewport ? { top: viewport.top, height: viewport.height } : undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
          <div className="flex items-center gap-2 border-b border-border px-3 py-2" style={{ paddingTop: "env(safe-area-inset-top)" }}>
            <span className="flex-1 font-heading text-lg font-medium">Search</span>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close search">
                <X className="size-5" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {isSearching ? (
              <div className="flex flex-col gap-1">
                {loading && <p className="px-1 py-1.5 text-sm text-muted-foreground">Searching…</p>}
                {!loading && catalogQuery.isError && sportsQuery.isError && (
                  <p className="px-1 py-1.5 text-sm text-negative">Search failed. Try again.</p>
                )}
                {!loading && !(catalogQuery.isError && sportsQuery.isError) && suggestions.length === 0 && (
                  <p className="px-1 py-1.5 text-sm text-muted-foreground">No matches yet — keep typing or try a different name.</p>
                )}
                {suggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => submit(name)}
                    className="flex items-center gap-2 rounded-md px-2 py-2.5 text-left text-sm hover:bg-surface-elevated"
                  >
                    <Search className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{name}</span>
                  </button>
                ))}
              </div>
            ) : recent.length > 0 ? (
              <div className="flex flex-col gap-1">
                <p className="px-1 pb-1 text-xs font-medium text-muted-foreground">Recent searches</p>
                {recent.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => submit(q)}
                    className="flex items-center gap-2 rounded-md px-2 py-2.5 text-left text-sm hover:bg-surface-elevated"
                  >
                    <Search className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{q}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-1 py-1.5 text-sm text-muted-foreground">
                Search for any card or product. Your recent searches will show up here.
              </p>
            )}
          </div>

          <div
            className="flex flex-col gap-1.5 border-t border-border px-3 py-2"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
          >
            {dictation.listening && (
              <p className="px-1 text-xs text-primary">Listening… tap a suggestion above to confirm, or the mic to stop.</p>
            )}
            <div className="flex items-center gap-1.5">
              <Input
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit(value);
                }}
                placeholder="Search any card or product…"
                className="h-10 flex-1 bg-surface-elevated border-border"
              />
              {dictation.supported && (
                <Button
                  type="button"
                  variant={dictation.listening ? "default" : "ghost"}
                  size="icon"
                  aria-label={dictation.listening ? "Stop dictation" : "Start dictation"}
                  aria-pressed={dictation.listening}
                  onClick={() => (dictation.listening ? dictation.stop() : dictation.start())}
                  className={cn(dictation.listening && "animate-pulse")}
                >
                  <Mic className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
