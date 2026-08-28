"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { MassScanCapture, type CapturedPhoto } from "@/app/scan/_components/mass-scan-capture";
import { ScanReviewGrid } from "@/app/scan/_components/scan-review-grid";
import { BatchConfirmBar } from "@/app/scan/_components/batch-confirm-bar";
import { ChangeCardDialog } from "@/app/scan/_components/change-card-dialog";
import { ScanCompleteSummary, type CommitOutcomeRow } from "@/app/scan/_components/scan-complete-summary";
import {
  buildReviewItems,
  computeBatchSummary,
  replaceCard,
  setCandidate,
  skipItem,
  toggleInclude,
  toHoldingInputs,
  unskipItem,
  type ReviewItem,
  type ScannedPhoto,
} from "@/lib/scan-cards/review-state";
import type { CandidateMatch, ScanResult } from "@/lib/scanning";
import type { RetryIdentifyResponse } from "@/app/api/scan/mass/retry/route";
import { id as makeClientId } from "@/lib/pc/id";
import { usePCStore } from "@/lib/pc/store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type Step = "idle" | "processing" | "review" | "committing" | "complete";

interface PhotoOutcome {
  photoId: string;
  status: "done" | "error";
  result?: ScanResult;
  error?: string;
}

async function scanOnePhoto(photo: CapturedPhoto): Promise<PhotoOutcome> {
  try {
    const res = await fetch("/api/scan/mass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64: photo.base64,
        mimeType: photo.mimeType,
        imagePixelWidth: photo.pixelWidth,
        imagePixelHeight: photo.pixelHeight,
      }),
    });
    if (!res.ok) return { photoId: photo.id, status: "error", error: "Couldn't process this photo." };
    const result: ScanResult = await res.json();
    if (result.error) return { photoId: photo.id, status: "error", error: result.error };
    return { photoId: photo.id, status: "done", result };
  } catch {
    return { photoId: photo.id, status: "error", error: "Network error — check your connection and try again." };
  }
}

export function ScanClient() {
  const [step, setStep] = React.useState<Step>("idle");
  const [photos, setPhotos] = React.useState<CapturedPhoto[]>([]);
  const [scannedPhotos, setScannedPhotos] = React.useState<Map<string, ScannedPhoto>>(new Map());
  const [failedPhotos, setFailedPhotos] = React.useState<Map<string, string>>(new Map());
  const [items, setItems] = React.useState<ReviewItem[]>([]);
  const [changeCardKey, setChangeCardKey] = React.useState<string | null>(null);
  const [retryingKeys, setRetryingKeys] = React.useState<Set<string>>(new Set());
  const [committing, setCommitting] = React.useState(false);
  const [commitRows, setCommitRows] = React.useState<CommitOutcomeRow[] | null>(null);
  const [pendingHoldings, setPendingHoldings] = React.useState<
    { id: string; catalogItemId?: string; sportsCardItemId?: string; name: string; setName: string }[]
  >([]);

  const pcs = usePCStore((s) => s.pcs);
  const activePCId = usePCStore((s) => s.activePCId);
  // No PC explicitly picked yet -> default to the active PC; once the
  // reviewer picks one via the Select below, that choice wins even if
  // activePCId later changes. Derived at render time (not synced via an
  // effect) per https://react.dev/learn/you-might-not-need-an-effect, same
  // pattern src/components/pc/add-holding-dialog.tsx already uses.
  const [pcIdOverride, setPcIdOverride] = React.useState<string | undefined>(undefined);
  const pcId = pcIdOverride ?? activePCId;
  const lastUsedCostBasisCurrency = usePCStore((s) => s.preferences.lastUsedCostBasisCurrency);
  const queryClient = useQueryClient();

  function reset() {
    setStep("idle");
    setPhotos([]);
    setScannedPhotos(new Map());
    setFailedPhotos(new Map());
    setItems([]);
    setCommitRows(null);
    setPendingHoldings([]);
  }

  async function processPhotos(toProcess: CapturedPhoto[]) {
    setStep("processing");
    const outcomes = await Promise.allSettled(toProcess.map(scanOnePhoto));

    const nextScanned = new Map(scannedPhotos);
    const nextFailed = new Map(failedPhotos);
    for (let i = 0; i < outcomes.length; i++) {
      const outcome = outcomes[i];
      const photo = toProcess[i];
      // Promise.allSettled never rejects its own entries — scanOnePhoto
      // already catches — but guard defensively so one truly unexpected
      // throw still can't wipe out the other photos' results.
      if (outcome.status !== "fulfilled") {
        nextFailed.set(photo.id, "Something went wrong scanning this photo.");
        continue;
      }
      if (outcome.value.status === "error") {
        nextFailed.set(photo.id, outcome.value.error ?? "Couldn't process this photo.");
      } else if (outcome.value.result) {
        nextScanned.set(photo.id, { previewUrl: photo.previewUrl, result: outcome.value.result });
        nextFailed.delete(photo.id);
      }
    }
    setScannedPhotos(nextScanned);
    setFailedPhotos(nextFailed);
    setItems(buildReviewItems(Array.from(nextScanned.values())));
    setStep("review");
  }

  function addPhotos(newPhotos: CapturedPhoto[]) {
    setPhotos((p) => [...p, ...newPhotos]);
  }

  function removePhoto(photoId: string) {
    setPhotos((p) => p.filter((ph) => ph.id !== photoId));
  }

  async function retryPhoto(photoId: string) {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;
    const outcome = await scanOnePhoto(photo);
    const nextScanned = new Map(scannedPhotos);
    const nextFailed = new Map(failedPhotos);
    if (outcome.status === "error") {
      nextFailed.set(photoId, outcome.error ?? "Couldn't process this photo.");
    } else if (outcome.result) {
      nextScanned.set(photoId, { previewUrl: photo.previewUrl, result: outcome.result });
      nextFailed.delete(photoId);
    }
    setScannedPhotos(nextScanned);
    setFailedPhotos(nextFailed);
    setItems(buildReviewItems(Array.from(nextScanned.values())));
  }

  async function handleRetryIdentify(key: string) {
    const item = items.find((i) => i.key === key);
    if (!item || !item.card.croppedImage) return;
    setRetryingKeys((s) => new Set(s).add(key));
    try {
      const res = await fetch("/api/scan/mass/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          croppedImage: item.card.croppedImage,
          detectionConfidence: item.card.detectionConfidence,
        }),
      });
      if (!res.ok) return;
      const data: RetryIdentifyResponse = await res.json();
      setItems((prev) =>
        replaceCard(prev, key, {
          ...item.card,
          identificationStatus: data.identificationStatus,
          identificationConfidence: data.identificationConfidence,
          candidates: data.candidates,
          error: data.error,
          confidenceLevel: data.confidenceLevel,
          needsReview: data.needsReview,
        })
      );
    } finally {
      setRetryingKeys((s) => {
        const next = new Set(s);
        next.delete(key);
        return next;
      });
    }
  }

  function handleSelectCandidate(candidate: CandidateMatch) {
    if (!changeCardKey) return;
    setItems((prev) => setCandidate(prev, changeCardKey, candidate));
  }

  async function commitBatch() {
    if (!pcId) return;
    setStep("committing");
    setCommitting(true);
    const defaults = { language: "EN" as const, costBasisCurrency: lastUsedCostBasisCurrency ?? ("USD" as const) };
    const holdingInputs = toHoldingInputs(items, defaults, makeClientId);
    const includedItems = items.filter((i) => i.includeInBatch && !i.card.skipped && i.card.selectedCandidateId);
    const nameByHoldingId = new Map(
      holdingInputs.map((h, i) => {
        const selected = includedItems[i].card.candidates.find(
          (c) => c.catalogItemId === includedItems[i].card.selectedCandidateId
        );
        return [h.id, { name: selected?.name ?? "Unknown card", setName: selected?.setName ?? "" }];
      })
    );
    setPendingHoldings(
      holdingInputs.map((h) => ({
        id: h.id,
        catalogItemId: h.catalogItemId,
        sportsCardItemId: h.sportsCardItemId,
        name: nameByHoldingId.get(h.id)?.name ?? "Unknown card",
        setName: nameByHoldingId.get(h.id)?.setName ?? "",
      }))
    );

    try {
      const res = await fetch(`/api/pc/${pcId}/holdings/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: holdingInputs }),
      });
      if (res.ok) {
        const data: { results: { id: string; status: "created" | "failed"; error?: string }[] } = await res.json();
        setCommitRows(
          data.results.map((r) => ({
            ...r,
            name: nameByHoldingId.get(r.id)?.name ?? "Unknown card",
            setName: nameByHoldingId.get(r.id)?.setName ?? "",
          }))
        );
      } else {
        setCommitRows(
          holdingInputs.map((h) => ({
            id: h.id,
            status: "failed" as const,
            error: "Couldn't reach the server.",
            name: nameByHoldingId.get(h.id)?.name ?? "Unknown card",
            setName: nameByHoldingId.get(h.id)?.setName ?? "",
          }))
        );
      }
    } catch {
      setCommitRows(
        holdingInputs.map((h) => ({
          id: h.id,
          status: "failed" as const,
          error: "Network error — check your connection and try again.",
          name: nameByHoldingId.get(h.id)?.name ?? "Unknown card",
          setName: nameByHoldingId.get(h.id)?.setName ?? "",
        }))
      );
    } finally {
      setCommitting(false);
      setStep("complete");
      queryClient.invalidateQueries({ queryKey: ["pc"] });
    }
  }

  async function retryFailedHoldings() {
    if (!pcId || !commitRows) return;
    const failed = commitRows.filter((r) => r.status === "failed");
    if (failed.length === 0) return;
    const retryInputs = pendingHoldings
      .filter((h) => failed.some((f) => f.id === h.id))
      .map((h) => {
        const defaults = { language: "EN" as const, costBasisCurrency: lastUsedCostBasisCurrency ?? ("USD" as const) };
        return {
          id: h.id,
          kind: (h.sportsCardItemId ? "sports" : "tcg") as "tcg" | "sports",
          catalogItemId: h.catalogItemId,
          sportsCardItemId: h.sportsCardItemId,
          quantity: 1,
          condition: "raw" as const,
          language: defaults.language,
          costBasisTotal: 0,
          costBasisCurrency: defaults.costBasisCurrency,
          acquiredAt: null,
        };
      });
    setCommitting(true);
    try {
      const res = await fetch(`/api/pc/${pcId}/holdings/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: retryInputs }),
      });
      if (res.ok) {
        const data: { results: { id: string; status: "created" | "failed"; error?: string }[] } = await res.json();
        setCommitRows((prev) =>
          (prev ?? []).map((r) => {
            const updated = data.results.find((d) => d.id === r.id);
            return updated ? { ...r, status: updated.status, error: updated.error } : r;
          })
        );
      }
    } finally {
      setCommitting(false);
      queryClient.invalidateQueries({ queryKey: ["pc"] });
    }
  }

  const summary = computeBatchSummary(items);
  const changeCardItem = items.find((i) => i.key === changeCardKey);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <h1 className="mb-1 text-lg font-semibold">Scan Cards</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Scan multiple cards at once and add them to your collection.
      </p>

      {step === "idle" && (
        <MassScanCapture
          photos={photos}
          onAddPhotos={addPhotos}
          onRemovePhoto={removePhoto}
          onSubmit={() => processPhotos(photos)}
        />
      )}

      {step === "processing" && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Analyzing {photos.length} photo{photos.length === 1 ? "" : "s"}…
          </p>
        </div>
      )}

      {(step === "review" || step === "committing") && (
        <div className="flex flex-col gap-6 pb-24">
          {failedPhotos.size > 0 && (
            <div className="flex flex-col gap-2 rounded-lg border border-negative/30 bg-negative/5 p-3 text-sm">
              {Array.from(failedPhotos.entries()).map(([photoId, message]) => (
                <div key={photoId} className="flex items-center justify-between gap-2">
                  <span>{message}</span>
                  <button
                    type="button"
                    className="font-medium text-primary underline-offset-2 hover:underline"
                    onClick={() => retryPhoto(photoId)}
                  >
                    Retry photo
                  </button>
                </div>
              ))}
            </div>
          )}

          {items.length === 0 && failedPhotos.size === 0 && (
            <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
              No cards detected. Try a closer, more evenly lit photo.
            </div>
          )}

          {pcs.length > 1 && (
            <div className="grid max-w-xs gap-1.5">
              <Label>Add to PC</Label>
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

          <ScanReviewGrid
            items={items}
            retryingKeys={retryingKeys}
            onToggleInclude={(key) => setItems((prev) => toggleInclude(prev, key))}
            onSkip={(key) => setItems((prev) => skipItem(prev, key))}
            onUnskip={(key) => setItems((prev) => unskipItem(prev, key))}
            onChangeCard={(key) => setChangeCardKey(key)}
            onRetry={handleRetryIdentify}
          />

          {items.length > 0 && (
            <BatchConfirmBar summary={summary} onCommit={commitBatch} committing={committing} />
          )}
        </div>
      )}

      {step === "complete" && commitRows && (
        <ScanCompleteSummary
          rows={commitRows}
          skippedCount={summary.skipped}
          onRetryFailed={retryFailedHoldings}
          onScanMore={reset}
          retryingFailed={committing}
        />
      )}

      <ChangeCardDialog
        open={!!changeCardKey}
        onOpenChange={(open) => !open && setChangeCardKey(null)}
        initialQuery={
          changeCardItem?.card.candidates.find((c) => c.catalogItemId === changeCardItem.card.selectedCandidateId)
            ?.name
        }
        onSelect={handleSelectCandidate}
      />
    </div>
  );
}
