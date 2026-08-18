"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatMoneyIn } from "@/lib/utils/format";
import { usePCStore } from "@/lib/pc/store";
import { pcKind, type CardCondition, type ItemLanguage } from "@/lib/pc/types";
import { resolvePriceAtDate } from "@/lib/pc/resolve-price-at-date";
import { useShortlistStore } from "@/lib/shortlist/store";
import { computeShortlistTotals, type EnrichedShortlistItem } from "@/lib/shortlist/selectors";

/**
 * "I bought these" — turns the selected shortlist rows into real Holdings
 * in one PC, using one condition/language/date for all of them (per-card
 * overrides are out of scope for v1). Everything not bought stays in the
 * shortlist untouched.
 */
export function ShortlistCheckoutDialog({
  open,
  onOpenChange,
  rows,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The selected, enriched rows being bought. */
  rows: EnrichedShortlistItem[];
  /** Called with the ids that were actually removed (i.e. successfully added). */
  onDone: (succeededIds: string[]) => void;
}) {
  const pcs = usePCStore((s) => s.pcs);
  const activePCId = usePCStore((s) => s.activePCId);
  const businessMode = usePCStore((s) => s.preferences.businessMode);
  const businessPC = pcs.find((p) => pcKind(p) === "business");
  const defaultPCId = (businessMode && businessPC ? businessPC.id : activePCId) || pcs[0]?.id || "";

  const addHolding = usePCStore((s) => s.addHolding);
  const removeShortlistItems = useShortlistStore((s) => s.removeShortlistItems);
  const lastUsedCostBasisCurrency = usePCStore((s) => s.preferences.lastUsedCostBasisCurrency);
  const setLastUsedCostBasisCurrency = usePCStore((s) => s.setLastUsedCostBasisCurrency);

  const [pcId, setPCId] = React.useState(defaultPCId);
  const [condition, setCondition] = React.useState<CardCondition>("raw");
  const [gradeCompany, setGradeCompany] = React.useState("PSA");
  const [gradeValue, setGradeValue] = React.useState("10");
  const [language, setLanguage] = React.useState<ItemLanguage>("EN");
  const [acquiredAt, setAcquiredAt] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<{ succeeded: number; failed: number } | null>(null);
  // The rows actually being submitted. Starts as every selected row; after
  // a partial failure it narrows to just the ones that didn't land, so a
  // "Retry" click can't re-submit (and double-add) the ones that already
  // succeeded and left the shortlist.
  const [pending, setPending] = React.useState(rows);

  // Re-default each time the dialog opens — adjusted during render, not in
  // an effect, same pattern as AddHoldingDialog's prevOpen.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPCId(defaultPCId);
      setLanguage("EN");
      setCondition("raw");
      setAcquiredAt(new Date().toISOString().slice(0, 10));
      setResult(null);
      setPending(rows);
    }
  }

  const totals = computeShortlistTotals(pending);

  async function handleCheckout() {
    setSubmitting(true);
    const succeeded: string[] = [];
    const failed: string[] = [];

    // Sequential, not Promise.all: addHolding needs to be awaited/caught one
    // at a time to know which rows actually landed, resolvePriceAtDate can
    // hit the network per card when backdated, and each failure on the
    // remote store triggers a full ["pc"] refetch — parallel failures would
    // mean parallel refetches for no benefit.
    const failedRows: typeof pending = [];
    for (const row of pending) {
      try {
        const priceAtAcquisition = await resolvePriceAtDate({
          date: acquiredAt,
          liveSuggestedPrice: row.marketUnitPrice,
          catalogItemId: row.catalogItemId,
          sportsCardItemId: row.sportsCardItemId,
        });
        await addHolding(pcId, {
          kind: row.kind === "sports" ? "sports" : "tcg",
          catalogItemId: row.catalogItemId,
          sportsCardItemId: row.sportsCardItemId,
          customName: row.kind === "custom" ? row.customName : undefined,
          quantity: row.quantity,
          condition,
          gradeCompany: condition === "graded" ? gradeCompany : undefined,
          gradeValue: condition === "graded" ? gradeValue : undefined,
          language,
          // Per-unit asking price -> a total cost basis, in the currency it
          // was entered in — never converted (see ShortlistItem.askingPrice).
          costBasisTotal: row.askingPrice * row.quantity,
          costBasisCurrency: row.askingCurrency,
          priceAtAcquisition,
          acquiredAt: new Date(acquiredAt).toISOString(),
        });
        succeeded.push(row.id);
      } catch {
        failed.push(row.id);
        failedRows.push(row);
      }
    }

    if (succeeded.length > 0) {
      removeShortlistItems(succeeded);
      setLastUsedCostBasisCurrency(pending[0]?.askingCurrency ?? lastUsedCostBasisCurrency);
    }
    setSubmitting(false);
    setPending(failedRows);

    if (failed.length === 0) {
      onOpenChange(false);
      onDone(succeeded);
    } else {
      // Keep the dialog open — there's no toast in this app, so the outcome
      // has to live here. Failures were never written server-side (the
      // remote store's optimistic patch already rolled itself back) and
      // successes are already gone from the shortlist, so retrying is safe:
      // nothing can double-add.
      setResult({ succeeded: succeeded.length, failed: failed.length });
      onDone(succeeded);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="bg-surface border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>I bought these</DialogTitle>
          <DialogDescription>
            These settings apply to all {pending.length} card{pending.length === 1 ? "" : "s"}. Anything left in
            your shortlist stays there.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex flex-col gap-1 rounded-lg border border-border bg-background p-2 text-sm">
            {pending.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-muted-foreground">
                  {r.quantity > 1 ? `${r.quantity}× ` : ""}
                  {r.display.name}
                </span>
                <span className="num-tabular flex-none">{formatMoneyIn(r.askingTotal, r.askingCurrency)}</span>
              </div>
            ))}
            <div className="mt-1 border-t border-border pt-1 text-right font-medium">
              {totals.byCurrency.map((c) => formatMoneyIn(c.total, c.currency)).join("  +  ")}
            </div>
          </div>

          {pcs.length > 1 && (
            <div className="grid gap-1.5">
              <Label>Add to</Label>
              <Select value={pcId} onValueChange={setPCId}>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="checkout-language">Language</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as ItemLanguage)}>
                <SelectTrigger id="checkout-language" className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EN">English</SelectItem>
                  <SelectItem value="JP">Japanese</SelectItem>
                  <SelectItem value="CN">Chinese (Simplified)</SelectItem>
                  <SelectItem value="TW">Chinese (Traditional)</SelectItem>
                  <SelectItem value="KR">Korean</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="checkout-acquired">Acquired on</Label>
              <Input
                id="checkout-acquired"
                type="date"
                value={acquiredAt}
                onChange={(e) => setAcquiredAt(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Condition</Label>
            <RadioGroup
              value={condition}
              onValueChange={(v) => setCondition(v as CardCondition)}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="raw" /> Raw
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="graded" /> Graded
              </label>
            </RadioGroup>
          </div>

          {condition === "graded" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="checkout-grade-company">Grading co.</Label>
                <Input
                  id="checkout-grade-company"
                  value={gradeCompany}
                  onChange={(e) => setGradeCompany(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="checkout-grade-value">Grade</Label>
                <Input
                  id="checkout-grade-value"
                  value={gradeValue}
                  onChange={(e) => setGradeValue(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>
          )}
        </div>

        {result && (
          <p className="text-sm text-negative">
            Added {result.succeeded} of {result.succeeded + result.failed} cards
            {pcs.find((p) => p.id === pcId) ? ` to ${pcs.find((p) => p.id === pcId)!.name}` : ""}. {result.failed}{" "}
            couldn&apos;t be saved and {result.failed === 1 ? "is" : "are"} still in your shortlist — try again.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {result ? "Close" : "Cancel"}
          </Button>
          <Button onClick={handleCheckout} disabled={submitting || !pcId}>
            {submitting ? "Adding…" : result ? "Retry" : "Confirm purchase"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
