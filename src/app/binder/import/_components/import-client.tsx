"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { usePCStore } from "@/lib/pc/store";
import { useBinderStore } from "@/lib/binder/store";
import { BINDER_LAYOUTS, pocketCount } from "@/lib/binder/types";
import { id as makeId } from "@/lib/pc/id";
import type { CandidateMatch, ScanResult } from "@/lib/scanning";
import {
  addScannedPage,
  advanceStage,
  buildPagePlacements,
  committablePocketIndexes,
  computePageSummary,
  confirmPageAt,
  createSession,
  detectBinderConflicts,
  hasUnresolvedConflicts,
  markPocketEmpty,
  markPocketSkip,
  markPocketUnidentified,
  partitionApplyOutcomes,
  placementsToApply,
  resolveBinderConflict,
  resolvePocketAmbiguity,
  setPlacementCandidate,
  toPlacementHoldingInputs,
  updatePageAt,
  type PlacementHoldingInput,
} from "@/lib/binder-import/session-state";
import { findAlreadyCommitted, recordCommittedPocket } from "@/lib/binder-import/commit-ledger";
import type { ImportPageResult, ImportSession, ImportStage, PagePlacement } from "@/lib/binder-import/types";

/** No-ops when the session is already at `target` — advanceStage itself throws on a same-stage or out-of-sequence jump (see its own doc comment), and several UI events here can legitimately fire while already in the target stage (e.g. scanning a second page while still REVIEWING the first's stage). */
function moveToStage(session: ImportSession, target: ImportStage): ImportSession {
  return session.stage === target ? session : advanceStage(session, target);
}
import { PageCapture, type CapturedPage } from "@/app/binder/import/_components/page-capture";
import { BinderGridPreview } from "@/app/binder/import/_components/binder-grid-preview";
import { PocketReviewControl } from "@/app/binder/import/_components/pocket-review-control";
import { PocketConflictDialog } from "@/app/binder/import/_components/pocket-conflict-dialog";
import { ImportPageConfirmBar } from "@/app/binder/import/_components/import-page-confirm-bar";
import { ChangeCardDialog } from "@/app/scan/_components/change-card-dialog";
import { DetectedCardsOverlay } from "@/app/scan/_components/detected-cards-overlay";

type Step = "capture" | "processing" | "review";

interface BatchResult {
  id: string;
  status: "created" | "failed";
  error?: string;
}

async function scanPage(page: CapturedPage, maxCards: number): Promise<ScanResult | null> {
  try {
    const res = await fetch("/api/scan/mass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64: page.base64,
        mimeType: page.mimeType,
        imagePixelWidth: page.pixelWidth,
        imagePixelHeight: page.pixelHeight,
        maxCards,
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as ScanResult;
  } catch {
    return null;
  }
}

/**
 * Ensures the binder has a page at `targetIndex` (0-based), creating pages
 * as needed via the existing store action — reads/writes the *live* store
 * state directly (useBinderStore.getState()) rather than a stale React
 * closure, since this runs inside an imperative commit flow, not render.
 */
function ensureBinderPageAt(binderId: string, targetIndex: number) {
  let binder = useBinderStore.getState().binders.find((b) => b.id === binderId);
  if (!binder) throw new Error("Binder not found");
  while (binder.pages.length <= targetIndex) {
    useBinderStore.getState().addPage(binderId);
    binder = useBinderStore.getState().binders.find((b) => b.id === binderId)!;
  }
  return binder.pages[targetIndex];
}

export function ImportClient({ binderId }: { binderId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const binders = useBinderStore((s) => s.binders);
  const placeCard = useBinderStore((s) => s.placeCard);
  const binder = binders.find((b) => b.id === binderId);

  const pcs = usePCStore((s) => s.pcs);
  const activePCId = usePCStore((s) => s.activePCId);
  const [pcIdOverride, setPcIdOverride] = React.useState<string | undefined>(undefined);
  const pcId = pcIdOverride ?? activePCId;
  const lastUsedCostBasisCurrency = usePCStore((s) => s.preferences.lastUsedCostBasisCurrency);

  const [session, setSession] = React.useState<ImportSession | null>(null);
  const [step, setStep] = React.useState<Step>("capture");
  const [scanError, setScanError] = React.useState<string | null>(null);
  const [reviewPocket, setReviewPocket] = React.useState<number | null>(null);
  const [changeCardOpen, setChangeCardOpen] = React.useState(false);
  const [conflictDialogOpen, setConflictDialogOpen] = React.useState(false);
  const [committing, setCommitting] = React.useState(false);
  const [pendingCommit, setPendingCommit] = React.useState<{ items: PlacementHoldingInput[]; results: BatchResult[] } | null>(null);
  const [confirmedPageCount, setConfirmedPageCount] = React.useState(0);
  const [orphanedHoldingCount, setOrphanedHoldingCount] = React.useState(0);
  // Set when handleConfirmPage finds pockets the commit-ledger already has
  // recorded for this binder/page (see commit-ledger.ts) — e.g. the session
  // was lost to a refresh after a prior commit already succeeded. Blocks the
  // next commitPage call until the reviewer explicitly acknowledges via
  // "Import anyway", so a refresh can never silently duplicate Holdings.
  const [duplicateWarning, setDuplicateWarning] = React.useState<{ pockets: number[] } | null>(null);

  // Creates the session the first time `binder` becomes available (it's
  // hydrated client-side from localStorage — see src/lib/binder/store.ts —
  // so it may be briefly undefined on first render). Derived during render
  // rather than an effect, matching src/app/binder/_components/
  // binder-client.tsx's own active-binder-reset pattern per
  // https://react.dev/learn/you-might-not-need-an-effect.
  const [sessionBinderId, setSessionBinderId] = React.useState<string | null>(null);
  if (binder && binder.id !== sessionBinderId) {
    setSessionBinderId(binder.id);
    setSession(createSession(binder.id, binder.layoutId, makeId()));
  }

  if (!binder) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center text-sm text-muted-foreground">
        Binder not found. <Link href="/binder" className="text-primary hover:underline">Back to Binder Planner</Link>
      </div>
    );
  }

  const layout = BINDER_LAYOUTS[binder.layoutId];
  const nextPageNumber = (session?.pages[session.pages.length - 1]?.physicalPageNumber ?? 0) + 1;
  const currentPage: ImportPageResult | undefined = session?.pages[session.currentPageIndex];

  function updateCurrentPage(fn: (page: ImportPageResult) => ImportPageResult) {
    setSession((s) => {
      if (!s) return s;
      const page = s.pages[s.currentPageIndex];
      if (!page) return s;
      return updatePageAt(s, s.currentPageIndex, fn(page));
    });
  }

  async function handleCapture(photo: CapturedPage, physicalPageNumber: number) {
    setStep("processing");
    setScanError(null);
    const result = await scanPage(photo, pocketCount(binder!.layoutId));
    if (!result || result.error) {
      setScanError(result?.error ?? "Couldn't process this photo. Check your connection and try again.");
      setStep("capture");
      return;
    }
    const page = buildPagePlacements(result, binder!.layoutId, physicalPageNumber, photo.previewUrl);
    setSession((s) => (s ? moveToStage(addScannedPage(s, page), "REVIEWING") : s));
    setStep("review");
  }

  function handleResolveConflict(pocketIndex: number, resolution: "keep" | "replace") {
    updateCurrentPage((page) => resolveBinderConflict(page, pocketIndex, resolution));
  }

  async function handleConfirmPage(skipDuplicateCheck = false) {
    if (!session || !currentPage || !pcId) return;
    const pageIndex = session.currentPageIndex;
    const targetIndex = currentPage.physicalPageNumber - 1;
    const binderPage = ensureBinderPageAt(binder!.id, targetIndex);
    // detectBinderConflicts only needs a non-null flag per pocket — pass a
    // stand-in id for catalog ("not owned")/custom-image pockets too, since
    // those still occupy the pocket and must block an overwrite the same as
    // a holding.
    const existingPockets = binderPage.pockets.map((ref) => {
      if (ref == null) return null;
      if (ref.kind === "holding") return ref.holdingId;
      if (ref.kind === "catalog") return ref.catalogItemId;
      if (ref.kind === "custom") return "custom";
      return "custom-covered";
    });
    const withConflicts = detectBinderConflicts(currentPage, existingPockets);
    updateCurrentPage(() => withConflicts);

    if (hasUnresolvedConflicts(withConflicts)) {
      setConflictDialogOpen(true);
      return;
    }

    // Guards against the case where this session was lost (e.g. a page
    // refresh) after an earlier commit for this exact binder + physical
    // page already succeeded — without this, toPlacementHoldingInputs would
    // generate brand-new random Holding ids for cards already in the PC,
    // creating real duplicates (addHoldingsBatch upserts by id; a new id is
    // a new row, not a no-op). See commit-ledger.ts.
    if (!skipDuplicateCheck && typeof window !== "undefined") {
      const pockets = committablePocketIndexes(withConflicts);
      const already = findAlreadyCommitted(window.localStorage, binder!.id, currentPage.physicalPageNumber, pockets);
      if (already.length > 0) {
        setDuplicateWarning({ pockets: already.map((a) => a.pocketIndex) });
        return;
      }
    }
    setDuplicateWarning(null);
    await commitPage(pageIndex, withConflicts, targetIndex);
  }

  async function commitPage(pageIndex: number, page: ImportPageResult, targetIndex: number) {
    if (!pcId) return;
    setCommitting(true);
    try {
      const defaults = { language: "EN" as const, costBasisCurrency: lastUsedCostBasisCurrency ?? ("USD" as const) };
      const items = toPlacementHoldingInputs(page, defaults, makeId);
      if (items.length === 0) {
        setSession((s) => (s ? moveToStage(confirmPageAt(s, pageIndex), "CONFIRMED") : s));
        setConfirmedPageCount((n) => n + 1);
        advanceToNextCapture();
        return;
      }

      let results: BatchResult[];
      try {
        const res = await fetch(`/api/pc/${pcId}/holdings/batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        results = res.ok
          ? ((await res.json()) as { results: BatchResult[] }).results
          : items.map((i) => ({ id: i.id, status: "failed" as const, error: "Couldn't reach the server." }));
      } catch {
        results = items.map((i) => ({ id: i.id, status: "failed" as const, error: "Network error." }));
      }

      const toApply = placementsToApply(items, results);
      const binderPage = ensureBinderPageAt(binder!.id, targetIndex);
      const placedPocketIndexes = new Set<number>();
      for (const { holdingId, pocketIndex } of toApply) {
        try {
          placeCard(binder!.id, binderPage.id, pocketIndex, { kind: "holding", holdingId });
          placedPocketIndexes.add(pocketIndex);
          if (typeof window !== "undefined") {
            recordCommittedPocket(window.localStorage, binder!.id, page.physicalPageNumber, pocketIndex, holdingId);
          }
        } catch (err) {
          // The holding exists in PC even if this local write failed — see
          // partitionApplyOutcomes's "orphaned" case, surfaced below via a
          // banner distinct from a failed-write retry (retrying the batch
          // endpoint again can't fix this; the write already succeeded).
          console.error("[binder-import] placeCard failed after successful holding write", err);
        }
      }
      const { orphaned } = partitionApplyOutcomes(toApply, placedPocketIndexes);
      if (orphaned.length > 0) setOrphanedHoldingCount((n) => n + orphaned.length);

      const failed = results.filter((r) => r.status === "failed");
      setPendingCommit({ items, results });
      queryClient.invalidateQueries({ queryKey: ["pc"] });

      if (failed.length === 0) {
        setSession((s) => (s ? moveToStage(confirmPageAt(s, pageIndex), "CONFIRMED") : s));
        setConfirmedPageCount((n) => n + 1);
        setPendingCommit(null);
        advanceToNextCapture();
      }
    } finally {
      setCommitting(false);
    }
  }

  async function retryFailedCommit() {
    if (!pcId || !pendingCommit || !session || !currentPage) return;
    const failedItems = pendingCommit.items.filter((i) =>
      pendingCommit.results.find((r) => r.id === i.id)?.status === "failed"
    );
    if (failedItems.length === 0) return;
    setCommitting(true);
    try {
      const res = await fetch(`/api/pc/${pcId}/holdings/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: pendingCommit.items }),
      });
      const results: BatchResult[] = res.ok
        ? ((await res.json()) as { results: BatchResult[] }).results
        : pendingCommit.items.map((i) => ({ id: i.id, status: "failed" as const, error: "Couldn't reach the server." }));

      const alreadyApplied = new Set(
        pendingCommit.results.filter((r) => r.status === "created").map((r) => r.id)
      );
      const toApply = placementsToApply(pendingCommit.items, results).filter((a) => {
        const item = pendingCommit.items.find((i) => i.pocketIndex === a.pocketIndex);
        return item && !alreadyApplied.has(item.id);
      });
      const targetIndex = currentPage.physicalPageNumber - 1;
      const binderPage = ensureBinderPageAt(binder!.id, targetIndex);
      const placedPocketIndexes = new Set<number>();
      for (const { holdingId, pocketIndex } of toApply) {
        try {
          placeCard(binder!.id, binderPage.id, pocketIndex, { kind: "holding", holdingId });
          placedPocketIndexes.add(pocketIndex);
          if (typeof window !== "undefined") {
            recordCommittedPocket(window.localStorage, binder!.id, currentPage.physicalPageNumber, pocketIndex, holdingId);
          }
        } catch (err) {
          console.error("[binder-import] placeCard failed after successful holding write (retry)", err);
        }
      }
      const { orphaned } = partitionApplyOutcomes(toApply, placedPocketIndexes);
      if (orphaned.length > 0) setOrphanedHoldingCount((n) => n + orphaned.length);

      const failed = results.filter((r) => r.status === "failed");
      queryClient.invalidateQueries({ queryKey: ["pc"] });
      if (failed.length === 0) {
        const pageIndex = session.currentPageIndex;
        setSession((s) => (s ? moveToStage(confirmPageAt(s, pageIndex), "CONFIRMED") : s));
        setConfirmedPageCount((n) => n + 1);
        setPendingCommit(null);
        advanceToNextCapture();
      } else {
        setPendingCommit({ items: pendingCommit.items, results });
      }
    } finally {
      setCommitting(false);
    }
  }

  function advanceToNextCapture() {
    setDuplicateWarning(null);
    setStep("capture");
  }

  const reviewPlacement: PagePlacement | null =
    reviewPocket != null ? (currentPage?.placements[reviewPocket] ?? null) : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 pb-24 sm:px-6">
      <div className="flex flex-col gap-1">
        <Link href="/binder" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back to Binder Planner
        </Link>
        <h1 className="font-heading text-xl font-semibold">Import Physical Binder — {binder.name}</h1>
        <p className="text-sm text-muted-foreground">
          {layout.label} · {confirmedPageCount} page{confirmedPageCount === 1 ? "" : "s"} placed this session
        </p>
      </div>

      {pcs.length > 1 && (
        <div className="grid max-w-xs gap-1.5">
          <Label>Add cards to</Label>
          <Select value={pcId} onValueChange={setPcIdOverride}>
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pcs.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {step === "capture" && (
        <>
          {scanError && (
            <div className="rounded-lg border border-negative/30 bg-negative/5 p-3 text-sm text-negative">{scanError}</div>
          )}
          <PageCapture nextPageNumber={nextPageNumber} onSubmit={handleCapture} />
          {confirmedPageCount > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                setSession((s) => (s ? moveToStage(s, "COMMITTED") : s));
                router.push("/binder");
              }}
            >
              Finish import
            </Button>
          )}
        </>
      )}

      {step === "processing" && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Detecting and identifying cards…</p>
        </div>
      )}

      {step === "review" && currentPage && (
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium">Page {currentPage.physicalPageNumber}</p>

          {currentPage.geometryWarning.suspicious && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
              <p className="font-medium">This page&apos;s geometry looks unusual — double-check every pocket against the photo.</p>
              <ul className="mt-1 list-inside list-disc text-xs opacity-90">
                {currentPage.geometryWarning.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {duplicateWarning && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-negative/30 bg-negative/5 p-3 text-sm text-negative">
              <span>
                {duplicateWarning.pockets.length} pocket{duplicateWarning.pockets.length === 1 ? "" : "s"} on this page
                already appear to be imported into this binder — confirming again will add duplicate cards.
              </span>
              <Button size="sm" variant="outline" onClick={() => handleConfirmPage(true)} disabled={committing}>
                Import anyway
              </Button>
            </div>
          )}

          {orphanedHoldingCount > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
              {orphanedHoldingCount} card{orphanedHoldingCount === 1 ? "" : "s"} were added to your collection but
              couldn&apos;t be placed in this binder —{" "}
              <Link href="/pc" className="underline">
                open your PC
              </Link>{" "}
              to place {orphanedHoldingCount === 1 ? "it" : "them"} manually.
            </div>
          )}

          <DetectedCardsOverlay
            previewUrl={currentPage.sourcePreviewUrl}
            cards={currentPage.placements.flatMap((p) => p.card ?? p.ambiguousCards ?? [])}
            labelFor={(card) => {
              const placement = currentPage.placements.find(
                (p) => p.card?.cardId === card.cardId || p.ambiguousCards?.some((c) => c.cardId === card.cardId)
              );
              return placement ? String(placement.pocketIndex + 1) : "?";
            }}
          />

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Virtual page preview — tap a pocket to correct it
            </p>
            <BinderGridPreview
              placements={currentPage.placements}
              rows={layout.rows}
              cols={layout.cols}
              onSelectPocket={setReviewPocket}
            />
          </div>

          {pendingCommit && pendingCommit.results.some((r) => r.status === "failed") && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-negative/30 bg-negative/5 p-3 text-sm">
              <span>
                {pendingCommit.results.filter((r) => r.status === "failed").length} card
                {pendingCommit.results.filter((r) => r.status === "failed").length === 1 ? "" : "s"} couldn&apos;t be added — the
                rest were placed successfully.
              </span>
              <Button size="sm" variant="outline" onClick={retryFailedCommit} disabled={committing}>
                Retry
              </Button>
            </div>
          )}

          <ImportPageConfirmBar summary={computePageSummary(currentPage)} onConfirm={() => handleConfirmPage()} committing={committing} />
        </div>
      )}

      <PocketReviewControl
        open={reviewPocket != null}
        onOpenChange={(open) => !open && setReviewPocket(null)}
        placement={reviewPlacement}
        onChangeCard={() => setChangeCardOpen(true)}
        onMarkEmpty={() => {
          if (reviewPocket != null) updateCurrentPage((page) => markPocketEmpty(page, reviewPocket));
          setReviewPocket(null);
        }}
        onMarkSkip={() => {
          if (reviewPocket != null) updateCurrentPage((page) => markPocketSkip(page, reviewPocket));
          setReviewPocket(null);
        }}
        onMarkUnidentified={() => {
          if (reviewPocket != null) updateCurrentPage((page) => markPocketUnidentified(page, reviewPocket));
          setReviewPocket(null);
        }}
        onResolveAmbiguity={(card) => {
          if (reviewPocket != null) updateCurrentPage((page) => resolvePocketAmbiguity(page, reviewPocket, card));
        }}
      />

      <ChangeCardDialog
        open={changeCardOpen}
        onOpenChange={setChangeCardOpen}
        onSelect={(candidate: CandidateMatch) => {
          if (reviewPocket != null) updateCurrentPage((page) => setPlacementCandidate(page, reviewPocket, candidate));
          setChangeCardOpen(false);
          setReviewPocket(null);
        }}
      />

      {currentPage && (
        <PocketConflictDialog
          open={conflictDialogOpen}
          onOpenChange={setConflictDialogOpen}
          conflicts={currentPage.placements.filter((p) => p.status === "conflict" && p.existingHoldingId !== undefined)}
          onResolve={handleResolveConflict}
          onCancelImport={() => {
            setConflictDialogOpen(false);
            router.push("/binder");
          }}
        />
      )}
    </div>
  );
}
