"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { usePortfolioStore } from "@/lib/portfolio/store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PortfolioStoreDataV1 } from "@/lib/portfolio/types";

const STORAGE_KEY = "cardstory:portfolio:v1";
const IMPORT_STATUS_KEY = "cardstory:portfolio:import-status";

/**
 * Shown once per browser, the first time it's authenticated with local
 * holdings still sitting in localStorage from prior anonymous use. Offers
 * to copy them into the account's server-backed portfolio. Local data is
 * never deleted either way — it just becomes inert once the switcher in
 * store.ts starts serving the remote store for a signed-in session.
 */
export function PortfolioImportPrompt() {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const setActivePortfolio = usePortfolioStore((s) => s.setActivePortfolio);
  const [open, setOpen] = React.useState(false);
  const [holdingCount, setHoldingCount] = React.useState(0);
  const [localData, setLocalData] = React.useState<PortfolioStoreDataV1 | null>(null);
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
      try {
        const parsed = JSON.parse(raw) as { state?: PortfolioStoreDataV1 };
        const data = parsed.state;
        const count = data?.portfolios?.reduce((sum, p) => sum + p.holdings.length, 0) ?? 0;
        if (data && count > 0) {
          setLocalData(data);
          setHoldingCount(count);
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
      const res = await fetch("/api/portfolio/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolios: localData.portfolios }),
      });
      if (res.ok) {
        localStorage.setItem(IMPORT_STATUS_KEY, "imported");
        queryClient.invalidateQueries({ queryKey: ["portfolio"] });

        // The active portfolio may currently point at an empty one that
        // GET /api/portfolio auto-created before this import ran (see the
        // cleanup note in manage.ts's importLocalPortfolio) — repoint it at
        // whichever imported portfolio actually has the holdings, so the
        // user lands somewhere with cards in it, not an empty default.
        const imported = localData.portfolios.filter((p) => p.holdings.length > 0);
        const wasActive = imported.find((p) => p.id === localData.activePortfolioId);
        const target = wasActive ?? imported[0];
        if (target) setActivePortfolio(target.id);

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
            This browser has {holdingCount} card{holdingCount === 1 ? "" : "s"} saved locally, from
            before you signed in. Import them into your account so they&apos;re available anywhere
            you log in.
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
