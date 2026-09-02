"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { useBinderStore } from "@/lib/binder/store";
import { normalizeLocalBinderData } from "@/lib/binder/local-migrate";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BinderStoreDataV3 } from "@/lib/binder/types";

const STORAGE_KEY = "cardstory:binder:v1";
const IMPORT_STATUS_KEY = "cardstory:binder:import-status";

/**
 * Shown once per browser, the first time it's authenticated with local
 * binders still sitting in localStorage from before Binder Planner was
 * server-backed (see src/lib/binder/store.ts). Offers to copy them into
 * the account. Local data is never deleted either way — it just becomes
 * inert once the server-backed store takes over. Same shape as
 * src/components/auth/pc-import-prompt.tsx.
 */
export function BinderImportPrompt() {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const setActiveBinder = useBinderStore((s) => s.setActiveBinder);
  const [open, setOpen] = React.useState(false);
  const [pocketCount, setPocketCount] = React.useState(0);
  const [localData, setLocalData] = React.useState<BinderStoreDataV3 | null>(null);
  const [importing, setImporting] = React.useState(false);

  React.useEffect(() => {
    if (status !== "authenticated") return;
    if (localStorage.getItem(IMPORT_STATUS_KEY)) return;

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    // Deferred so this reads as "react to the external localStorage state,"
    // not a synchronous setState-in-effect — same pattern as
    // pc-import-prompt.tsx.
    const t = setTimeout(() => {
      try {
        const parsed = JSON.parse(raw) as { state?: unknown };
        const data = normalizeLocalBinderData(parsed.state);
        if (!data) return;
        const filled = data.binders.reduce(
          (sum, b) => sum + b.pages.reduce((s, p) => s + p.pockets.filter((r) => r != null).length, 0),
          0
        );
        // Nothing but an untouched default binder — not worth a prompt.
        if (filled === 0) return;
        setLocalData(data);
        setPocketCount(filled);
        setOpen(true);
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
      const res = await fetch("/api/binder/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ binders: localData.binders }),
      });
      if (res.ok) {
        localStorage.setItem(IMPORT_STATUS_KEY, "imported");
        queryClient.invalidateQueries({ queryKey: ["binders"] });

        // The active binder may currently point at an empty one that
        // GET /api/binder auto-created before this import ran (see the
        // cleanup note in manage.ts's importLocalBinders) — repoint it at
        // whichever imported binder was active locally.
        const wasActive = localData.binders.find((b) => b.id === localData.activeBinderId);
        const target = wasActive ?? localData.binders[0];
        if (target) setActiveBinder(target.id);

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
          <DialogTitle>Import your binder{localData && localData.binders.length > 1 ? "s" : ""}?</DialogTitle>
          <DialogDescription>
            This browser has {pocketCount} card{pocketCount === 1 ? "" : "s"} placed in{" "}
            {localData?.binders.length ?? 0} binder{(localData?.binders.length ?? 0) === 1 ? "" : "s"}, from before
            Binder Planner synced to your account. Import {localData && localData.binders.length > 1 ? "them" : "it"}{" "}
            so they&apos;re available anywhere you log in.
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
