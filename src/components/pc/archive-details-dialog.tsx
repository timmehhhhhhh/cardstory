"use client";

import * as React from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
  LET_GO_METHODS,
  LET_GO_METHOD_LABELS,
  type LetGoMethod,
} from "@/lib/constants";
import type { LetGoDetails } from "@/lib/pc/api-schemas";

/**
 * Captures (or edits) the optional "how this card left the collection"
 * details — let-go date, method, who/what it went to, amount, notes. Used
 * two ways:
 *
 * - Archiving several holdings at once from BulkActionsBar's Archive
 *   button: the Save action *is* the archive confirmation, no separate
 *   window.confirm — every field is optional, the dialog explains they can
 *   be filled in later from Archives. A single card's trash icon
 *   (item-grid/item-gallery) deliberately skips this dialog and archives
 *   immediately — popping up a date picker every time someone wants to
 *   quickly archive one card was more friction than the optional details
 *   were worth, and those details can always be added afterwards from
 *   Archives.
 * - Editing an already-archived holding's details from PC Archives /
 *   Business Archives, pre-seeded via `initial`.
 *
 * Deliberately doesn't know about archiveHoldings/updateHolding itself —
 * the caller decides what a submit means, so this same form serves both
 * call sites. Controlled `open`/`onOpenChange`, re-seeds from `initial`
 * via the same prevKey/key diffing pattern as edit-holding-dialog.tsx.
 */
export function ArchiveDetailsDialog({
  open,
  onOpenChange,
  title,
  description,
  initial,
  submitLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  initial?: Partial<LetGoDetails>;
  submitLabel: string;
  onSubmit: (letGo: LetGoDetails) => void;
}) {
  const [letGoAt, setLetGoAt] = React.useState("");
  const [letGoMethod, setLetGoMethod] = React.useState<LetGoMethod | "">("");
  const [letGoTo, setLetGoTo] = React.useState("");
  const [letGoAmount, setLetGoAmount] = React.useState("");
  const [letGoCurrency, setLetGoCurrency] = React.useState<SupportedCurrency>("USD");
  const [letGoNotes, setLetGoNotes] = React.useState("");

  // Re-seed every field each time the dialog opens — adjusted during
  // render, not in an effect, same convention as EditHoldingDialog.
  const [wasOpen, setWasOpen] = React.useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setLetGoAt(initial?.letGoAt ? initial.letGoAt.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setLetGoMethod(initial?.letGoMethod ?? "");
      setLetGoTo(initial?.letGoTo ?? "");
      setLetGoAmount(initial?.letGoAmount != null ? String(initial.letGoAmount) : "");
      setLetGoCurrency(initial?.letGoCurrency ?? "USD");
      setLetGoNotes(initial?.letGoNotes ?? "");
    }
  }

  function handleSubmit() {
    onSubmit({
      letGoAt: letGoAt ? new Date(letGoAt).toISOString() : null,
      letGoMethod: letGoMethod || undefined,
      letGoTo: letGoTo.trim() || undefined,
      letGoAmount: letGoAmount.trim() ? Number(letGoAmount) : null,
      letGoCurrency,
      letGoNotes: letGoNotes.trim() || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
            {description ? " — " : ""}
            These details are optional and can always be added or changed later from Archives.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="letgo-date">Date let go</Label>
              <Input
                id="letgo-date"
                type="date"
                value={letGoAt}
                onChange={(e) => setLetGoAt(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="letgo-method">How</Label>
              <Select value={letGoMethod} onValueChange={(v) => setLetGoMethod(v as LetGoMethod)}>
                <SelectTrigger id="letgo-method" className="bg-background">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  {LET_GO_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {LET_GO_METHOD_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="letgo-to">Passed on to</Label>
            <Input
              id="letgo-to"
              placeholder="Who or what the card went to (optional)"
              value={letGoTo}
              onChange={(e) => setLetGoTo(e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="letgo-amount">Amount received</Label>
            <div className="flex gap-2">
              <Select value={letGoCurrency} onValueChange={(v) => setLetGoCurrency(v as SupportedCurrency)}>
                <SelectTrigger className="w-[84px] shrink-0 bg-background" aria-label="Currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="letgo-amount"
                type="number"
                step="0.01"
                min={0}
                placeholder="Leave blank if none"
                value={letGoAmount}
                onChange={(e) => setLetGoAmount(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="letgo-notes">Notes</Label>
            <Textarea
              id="letgo-notes"
              placeholder="Anything else worth remembering about this card"
              value={letGoNotes}
              onChange={(e) => setLetGoNotes(e.target.value)}
              className="bg-background"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
