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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { CardPhotoField } from "@/components/pc/card-photo-field";
import { usePCStore } from "@/lib/pc/store";
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
  CARD_CONDITIONS,
  CARD_CONDITION_LABELS,
  type RawCardCondition,
} from "@/lib/constants";
import { holdingIsCustom, type CardCondition, type ItemLanguage, type Holding } from "@/lib/pc/types";
import { resolvePriceAtDate } from "@/lib/pc/resolve-price-at-date";
import type { EnrichedHolding } from "@/lib/pc/selectors";
import { withEnglishName } from "@/lib/catalog/card-name";

/**
 * Edits an existing holding's own metadata (quantity, condition/grade,
 * language, cost basis, purchase date, notes, custom name, photo) — the
 * fields captured once at add-time via AddHoldingDialog but never editable
 * since. Deliberately a separate component rather than an add/edit mode on
 * AddHoldingDialog: there's no PC-destination picker here (the holding's
 * pc/catalog reference is fixed at creation) and this dialog exposes two
 * fields Add never does (customName, notes).
 *
 * Always controlled — mounted once per ItemGrid/ItemGallery and opened by
 * setting `holding` to a row from that list.
 */
export function EditHoldingDialog({
  holding,
  pcId,
  open,
  onOpenChange,
}: {
  holding: EnrichedHolding | null;
  pcId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [customName, setCustomName] = React.useState("");
  const [quantity, setQuantity] = React.useState(1);
  const [language, setLanguage] = React.useState<ItemLanguage>("EN");
  const [condition, setCondition] = React.useState<CardCondition>("raw");
  const [gradeCompany, setGradeCompany] = React.useState("");
  const [gradeValue, setGradeValue] = React.useState("");
  const [rawCondition, setRawCondition] = React.useState<RawCardCondition | "">("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [costBasis, setCostBasis] = React.useState("");
  const [costBasisCurrency, setCostBasisCurrency] = React.useState<SupportedCurrency>("USD");
  const [acquiredAt, setAcquiredAt] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const updateHolding = usePCStore((s) => s.updateHolding);

  // Re-seed every field from `holding` each time the dialog opens (or opens
  // on a different row) — adjusted during render, not in an effect, per
  // https://react.dev/learn/you-might-not-need-an-effect. Mirrors the
  // open/prevOpen diffing AddHoldingDialog uses.
  const [prevKey, setPrevKey] = React.useState<string | null>(null);
  const key = open && holding ? holding.id : null;
  if (key !== prevKey) {
    setPrevKey(key);
    if (key && holding) {
      setCustomName(holding.customName ?? "");
      setQuantity(holding.quantity);
      setLanguage(holding.language);
      setCondition(holding.condition);
      setGradeCompany(holding.gradeCompany ?? "PSA");
      setGradeValue(holding.gradeValue ?? "10");
      setRawCondition(holding.rawCondition ?? "");
      setImageUrl(holding.imageUrl ?? "");
      setCostBasis(holding.costBasisTotal.toFixed(2));
      setCostBasisCurrency(holding.costBasisCurrency);
      setAcquiredAt(holding.acquiredAt ? holding.acquiredAt.slice(0, 10) : "");
      setNotes(holding.notes ?? "");
      setError(null);
    }
  }

  if (!holding) return null;
  const isCustom = holdingIsCustom(holding);

  async function handleSave() {
    if (!holding) return;
    setSubmitting(true);
    setError(null);
    try {
      const acquiredAtChanged =
        acquiredAt !== (holding.acquiredAt ? holding.acquiredAt.slice(0, 10) : "");
      const priceAtAcquisition = acquiredAtChanged
        ? await resolvePriceAtDate({
            date: acquiredAt || null,
            liveSuggestedPrice: holding.unitPrice,
            catalogItemId: holding.catalogItemId,
            sportsCardItemId: holding.sportsCardItemId,
          })
        : undefined;

      const patch: Partial<Omit<Holding, "id">> = {
        quantity: Math.max(1, quantity),
        condition,
        gradeCompany: condition === "graded" ? gradeCompany : undefined,
        gradeValue: condition === "graded" ? gradeValue : undefined,
        rawCondition: condition === "raw" && rawCondition ? rawCondition : undefined,
        language,
        costBasisTotal: Number(costBasis) || 0,
        costBasisCurrency,
        acquiredAt: acquiredAt ? new Date(acquiredAt).toISOString() : null,
        imageUrl: imageUrl.trim() || undefined,
        notes: notes.trim() || undefined,
        ...(isCustom ? { customName: customName.trim() || undefined } : {}),
        ...(priceAtAcquisition !== undefined ? { priceAtAcquisition } : {}),
      };

      updateHolding(pcId, holding.id, patch);
      onOpenChange(false);
    } catch {
      setError("Couldn't save these changes. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit item</DialogTitle>
          <DialogDescription>{withEnglishName(holding.display.name, holding.display.nameEn)}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {isCustom && (
            <div className="grid gap-1.5">
              <Label htmlFor="customName">Name</Label>
              <Input
                id="customName"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="bg-background"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-quantity">Quantity</Label>
              <Input
                id="edit-quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="bg-background"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-language">Language</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as ItemLanguage)}>
                <SelectTrigger id="edit-language" className="bg-background">
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
                <Label htmlFor="edit-gradeCompany">Grading co.</Label>
                <Input
                  id="edit-gradeCompany"
                  value={gradeCompany}
                  onChange={(e) => setGradeCompany(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-gradeValue">Grade</Label>
                <Input
                  id="edit-gradeValue"
                  value={gradeValue}
                  onChange={(e) => setGradeValue(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>
          )}

          {condition === "raw" && (
            <div className="grid gap-1.5">
              <Label htmlFor="edit-rawCondition">Condition</Label>
              <Select value={rawCondition} onValueChange={(v) => setRawCondition(v as RawCardCondition)}>
                <SelectTrigger id="edit-rawCondition" className="bg-background">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  {CARD_CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CARD_CONDITION_LABELS[c]} ({c})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <CardPhotoField
            id="edit-holding-image"
            label="Photo of your card (optional)"
            helperText="Shown instead of the catalog image throughout your PC."
            value={imageUrl}
            onChange={setImageUrl}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-costBasis">Cost basis</Label>
              <div className="flex gap-2">
                <Select
                  value={costBasisCurrency}
                  onValueChange={(v) => setCostBasisCurrency(v as SupportedCurrency)}
                >
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
                  id="edit-costBasis"
                  type="number"
                  step="0.01"
                  min={0}
                  value={costBasis}
                  onChange={(e) => setCostBasis(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-acquiredAt">Acquired on</Label>
              <Input
                id="edit-acquiredAt"
                type="date"
                value={acquiredAt}
                onChange={(e) => setAcquiredAt(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-background"
            />
          </div>
        </div>

        {error && <p className="text-sm text-negative">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
