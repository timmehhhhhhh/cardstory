"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { usePCStore } from "@/lib/pc/store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PCStoreDataV1, WatchlistItem } from "@/lib/pc/types";
import type { ShortlistStoreDataV1 } from "@/lib/shortlist/types";

// Kept as "portfolio" (not "pc") to match src/lib/pc/local-store.ts's
// unchanged storage key, so existing local data is still found.
const STORAGE_KEY = "cardstory:portfolio:v1";
const SHORTLIST_STORAGE_KEY = "cardstory:shortlist:v1";
const IMPORT_STATUS_KEY = "cardstory:portfolio:import-status";

/**
 * This component reads raw localStorage JSON directly (below), bypassing
 * useLocalPCStore's zustand `persist` migration — so a browser that still
 * has the pre-upgrade watchlist shape (a bare catalogItemId[]) sitting in
 * storage could reach this point unmigrated. Defensively normalize the same
 * way local-store.ts's migrate() does, rather than sending malformed
 * entries to /api/pc/import.
 */
function normalizeWatchlist(watchlist: unknown): WatchlistItem[] {
  if (!Array.isArray(watchlist)) return [];
  return watchlist.map((entry): WatchlistItem =>
    typeof entry === "string"
      ? { itemId: entry, kind: entry.includes(":") ? "tcg" : "sports", addedAt: new Date().toISOString(), priceAtAdd: null }
      : (entry as WatchlistItem)
  );
}

/**
 * Reads the shortlist's own localStorage key directly — same "bypasses
 * zustand's persist migration" caveat as normalizeWatchlist above. Safe to
 * skip defensive normalization today: shortlist storage is at version 1
 * with no migrations yet, so whatever's there already matches ShortlistItem.
 * The next shortlist schema bump must add one here, same as watchlist's.
 */
function readLocalShortlist(): ShortlistStoreDataV1["items"] {
  try {
    const raw = localStorage.getItem(SHORTLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { state?: ShortlistStoreDataV1 };
    return parsed.state?.items ?? [];
  } catch {
    return [];
  }
}

/**
 * Shown once per browser, the first time it's authenticated with local
 * holdings still sitting in localStorage from prior anonymous use. Offers
 * to copy them into the account's server-backed PC. Local data is
 * never deleted either way — it just becomes inert once the switcher in
 * store.ts starts serving the remote store for a signed-in session.
 */
export function PCImportPrompt() {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const setActivePC = usePCStore((s) => s.setActivePC);
  const [open, setOpen] = React.useState(false);
  const [holdingCount, setHoldingCount] = React.useState(0);
  const [localData, setLocalData] = React.useState<PCStoreDataV1 | null>(null);
  const [localShortlist, setLocalShortlist] = React.useState<ShortlistStoreDataV1["items"]>([]);
  const [importing, setImporting] = React.useState(false);

  React.useEffect(() => {
    if (status !== "authenticated") return;
    if (localStorage.getItem(IMPORT_STATUS_KEY)) return;

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    // Deferred so this reads as "react to the external localStorage state,"
    // not a synchronous setState-in-effect (matches the debounce pattern in
    // src/app/trade-analyzer/_components/side-selector.tsx).
    const t = setTimeout(() => {
      const shortlist = readLocalShortlist();
      try {
        const parsed = JSON.parse(raw) as { state?: PCStoreDataV1 };
        const data = parsed.state;
        const count = data?.pcs?.reduce((sum, p) => sum + p.holdings.length, 0) ?? 0;
        // Widened from `count > 0` so a shopper who built a shortlist but
        // owns no holdings yet still gets offered the import — otherwise it
        // would vanish silently on login, right when it's about to be
        // needed for checkout.
        if (data && (count > 0 || shortlist.length > 0)) {
          setLocalData(data);
          setHoldingCount(count);
          setLocalShortlist(shortlist);
          setOpen(true);
        }
      } catch {
        // Malformed localStorage — nothing sensible to import.
      }
    }, 0);
    return () => clearTimeout(t);
  }, [status]);

  async function handleImport() {
    if (!localData) return;
    setImporting(true);
    try {
      const res = await fetch("/api/pc/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pcs: localData.pcs,
          watchlist: normalizeWatchlist(localData.watchlist),
          shortlist: localShortlist,
        }),
      });
      if (res.ok) {
        localStorage.setItem(IMPORT_STATUS_KEY, "imported");
        queryClient.invalidateQueries({ queryKey: ["pc"] });
        queryClient.invalidateQueries({ queryKey: ["watchlist"] });
        queryClient.invalidateQueries({ queryKey: ["shortlist"] });

        // The active PC may currently point at an empty one that
        // GET /api/pc auto-created before this import ran (see the
        // cleanup note in manage.ts's importLocalPC) — repoint it at
        // whichever imported PC actually has the holdings, so the
        // user lands somewhere with cards in it, not an empty default.
        const imported = localData.pcs.filter((p) => p.holdings.length > 0);
        const wasActive = imported.find((p) => p.id === localData.activePCId);
        const target = wasActive ?? imported[0];
        if (target) setActivePC(target.id);

        setOpen(false);
      }
    } finally {
      setImporting(false);
    }
  }

  function handleSkip() {
    localStorage.setItem(IMPORT_STATUS_KEY, "skipped");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleSkip()}>
      <DialogContent className="bg-surface border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import your collection?</DialogTitle>
          <DialogDescription>
            This browser has {holdingCount} card{holdingCount === 1 ? "" : "s"} saved locally
            {localShortlist.length > 0 && (
              <>
                {" "}
                and {localShortlist.length} shortlist item{localShortlist.length === 1 ? "" : "s"}
              </>
            )}, from before you signed in. Import them into your account so they&apos;re available
            anywhere you log in.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleSkip} disabled={importing}>
            Skip
          </Button>
          <Button onClick={handleImport} disabled={importing}>
            {importing ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
