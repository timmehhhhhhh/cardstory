"use client";

import * as React from "react";
import { PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { CardPhotoField } from "@/components/pc/card-photo-field";
import { usePCStore } from "@/lib/pc/store";
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
  CARD_CONDITIONS,
  CARD_CONDITION_LABELS,
  type RawCardCondition,
  ACQUISITION_METHODS,
  ACQUISITION_METHOD_LABELS,
  type AcquisitionMethod,
} from "@/lib/constants";
import { pcKind, type CardCondition, type ItemLanguage } from "@/lib/pc/types";
import { resolvePriceAtDate } from "@/lib/pc/resolve-price-at-date";
import { isNumberedSerialLimit } from "@/lib/sportscards/rarity";
import type { SportsCardVariant } from "@/lib/sportscards/manage";

export function AddHoldingDialog({
  catalogItemId,
  sportsCardItemId,
  cardName,
  suggestedPrice,
  defaultLanguage = "EN",
  trigger,
  open: openProp,
  onOpenChange,
  forcedPCId,
  title = "Add to PC",
}: {
  catalogItemId?: string;
  sportsCardItemId?: string;
  cardName: string;
  suggestedPrice: number | null;
  /** Pre-selects Language from the catalog item's own print language (e.g. a Japanese card tile opens this pre-set to Japanese) instead of always defaulting to English. */
  defaultLanguage?: ItemLanguage;
  trigger?: React.ReactNode;
  /**
   * Controlled open state — pass both when the caller owns its own trigger
   * element (e.g. a button that needs to call `preventDefault` to stop a
   * surrounding <Link> from navigating, which would otherwise race Radix's
   * DialogTrigger: it composes the trigger's onClick with its own
   * open-toggle handler and skips that handler once `defaultPrevented` is
   * set, so a preventDefault'ing trigger would never open the dialog).
   * When omitted, the dialog manages its own open state via DialogTrigger.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Locks the target PC to this id and hides the PC picker — used by
   * triggers that have a fixed destination in mind (e.g. CardTile's
   * Business Inventory quick-add), overriding the businessMode-based
   * default below so the add can't land anywhere else by accident.
   */
  forcedPCId?: string;
  /** Dialog heading — callers with a fixed target can relabel it (e.g. "Add to Business Inventory"). */
  title?: string;
}) {
  const isControlled = openProp !== undefined;
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = isControlled ? openProp : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;
  const [quantity, setQuantity] = React.useState(1);
  const [condition, setCondition] = React.useState<CardCondition>("raw");
  const [gradeCompany, setGradeCompany] = React.useState("PSA");
  const [gradeValue, setGradeValue] = React.useState("10");
  const [rawCondition, setRawCondition] = React.useState<RawCardCondition | "">("");
  const [language, setLanguage] = React.useState<ItemLanguage>(defaultLanguage);
  // Empty by default — Cost basis is only ever set explicitly by the user,
  // not silently pre-filled from the card's live market price (which is
  // what suggestedPrice is), same reasoning as Date Acquired below.
  const [costBasis, setCostBasis] = React.useState("");
  // Empty by default — Date Acquired is only ever set explicitly by the
  // user, not silently defaulted to today (see prisma/schema.prisma).
  const [acquiredAt, setAcquiredAt] = React.useState("");
  const [acquisitionMethod, setAcquisitionMethod] = React.useState<AcquisitionMethod | "">("");
  const [acquiredFrom, setAcquiredFrom] = React.useState("");
  const [acquisitionNotes, setAcquisitionNotes] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Which parallel/refractor of a sports card the user is adding — defaults
  // to whichever row they opened the dialog from (usually the base version,
  // since Explore now links to that by default). Fetched fresh each time
  // the dialog opens so a stale list can't silently omit a newer parallel.
  const [variants, setVariants] = React.useState<SportsCardVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = React.useState(sportsCardItemId);
  const [copyNumber, setCopyNumber] = React.useState("");
  const selectedVariant = variants.find((v) => v.sportsCardItemId === selectedVariantId);
  const showCopyNumberField = isNumberedSerialLimit(selectedVariant?.serialLimit);

  const pcs = usePCStore((s) => s.pcs);
  const activePCId = usePCStore((s) => s.activePCId);
  const businessMode = usePCStore((s) => s.preferences.businessMode);
  const businessPC = pcs.find((p) => pcKind(p) === "business");
  // While Business mode is on and a Business Inventory pc already
  // exists, default new adds there instead of the active personal
  // pc — see business-mode-toggle.tsx, which is what actually
  // creates that pc (before flipping businessMode on).
  const defaultPCId =
    forcedPCId ?? (businessMode && businessPC ? businessPC.id : activePCId);
  const [pcId, setPCId] = React.useState(defaultPCId);
  // Whichever pc is currently targeted (picker selection, or the forced/
  // default one) — drives the "Add to PC" vs "Add to Business Inventory"
  // button copy so it always matches where the card is actually landing.
  const targetPC = pcs.find((p) => p.id === pcId);
  const addButtonLabel =
    targetPC && pcKind(targetPC) === "business" ? "Add to Business Inventory" : "Add to PC";
  const addHolding = usePCStore((s) => s.addHolding);
  const lastUsedCostBasisCurrency = usePCStore(
    (s) => s.preferences.lastUsedCostBasisCurrency
  );
  const setLastUsedCostBasisCurrency = usePCStore((s) => s.setLastUsedCostBasisCurrency);
  // Settings-configured default (see settings-client.tsx) takes priority
  // over the last currency picked in any Add-to-PC dialog — null until the
  // user sets one.
  const defaultCostBasisCurrency = usePCStore(
    (s) => s.preferences.defaultCostBasisCurrency
  );
  const [costBasisCurrency, setCostBasisCurrency] = React.useState<SupportedCurrency>(
    defaultCostBasisCurrency ?? lastUsedCostBasisCurrency ?? "USD"
  );

  // Re-default the target pc (and Language, from the catalog item's
  // own print language) each time the dialog opens — adjusted during render
  // (not in an effect) per https://react.dev/learn/you-might-not-need-an-effect.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPCId(defaultPCId);
      setLanguage(defaultLanguage);
      setCostBasis("");
      setCostBasisCurrency(defaultCostBasisCurrency ?? lastUsedCostBasisCurrency ?? "USD");
      setRawCondition("");
      setAcquiredAt("");
      setAcquisitionMethod("");
      setAcquiredFrom("");
      setAcquisitionNotes("");
      setError(null);
      setSelectedVariantId(sportsCardItemId);
      setCopyNumber("");
      setVariants([]);
    }
  }

  // Fetch this card's known parallels/refractors fresh each time the dialog
  // opens, so the picker below can offer them. No-op for TCG cards
  // (sportsCardItemId unset) and for a sports card with no known parallels
  // (the fetch just resolves to a single-item list, so the picker below
  // stays hidden per its own `variants.length > 1` guard).
  React.useEffect(() => {
    if (!open || !sportsCardItemId) return;
    let cancelled = false;
    fetch(`/api/sportscards/${sportsCardItemId}/variants`)
      .then((res) => (res.ok ? res.json() : { variants: [] }))
      .then((data: { variants: SportsCardVariant[] }) => {
        if (!cancelled) setVariants(data.variants);
      })
      .catch(() => {
        if (!cancelled) setVariants([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, sportsCardItemId]);

  async function handleAdd() {
    setSubmitting(true);
    setError(null);
    try {
      // If the user picked a different parallel than the one this dialog
      // was opened with, everything below (price lookup, cost basis,
      // the holding itself) targets that variant's own row instead.
      const effectiveSportsCardItemId = sportsCardItemId ? selectedVariantId : undefined;
      const priceAtAcquisition = await resolvePriceAtDate({
        date: acquiredAt || null,
        liveSuggestedPrice:
          effectiveSportsCardItemId === sportsCardItemId ? suggestedPrice : (selectedVariant?.priceRaw ?? null),
        catalogItemId,
        sportsCardItemId: effectiveSportsCardItemId,
      });
      await addHolding(pcId, {
        kind: sportsCardItemId ? "sports" : "tcg",
        catalogItemId,
        sportsCardItemId: effectiveSportsCardItemId,
        quantity: Math.min(20, Math.max(1, quantity)),
        condition,
        gradeCompany: condition === "graded" ? gradeCompany : undefined,
        gradeValue: condition === "graded" ? gradeValue : undefined,
        rawCondition: condition === "raw" && rawCondition ? rawCondition : undefined,
        language,
        costBasisTotal: Number(costBasis) || 0,
        costBasisCurrency,
        priceAtAcquisition,
        acquiredAt: acquiredAt ? new Date(acquiredAt).toISOString() : null,
        acquisitionMethod: acquisitionMethod || undefined,
        acquiredFrom: acquiredFrom.trim() || undefined,
        acquisitionNotes:
          acquisitionMethod === "other" && acquisitionNotes.trim() ? acquisitionNotes.trim() : undefined,
        imageUrl: imageUrl.trim() || undefined,
        serialNumber: showCopyNumberField && copyNumber.trim() ? copyNumber.trim() : undefined,
      });
      setLastUsedCostBasisCurrency(costBasisCurrency);
      setOpen(false);
    } catch {
      // addHolding already rolls the optimistic add back out of the
      // cache on failure (see useRemotePCStore) — this just makes sure
      // the user actually finds out, instead of the dialog quietly
      // closing on a card that never really landed in their PC.
      setError("Couldn't add this card. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button className="w-full">
              <PackagePlus className="size-4" /> {addButtonLabel}
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="bg-surface border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{cardName}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {pcs.length > 1 && !forcedPCId && (
            <div className="grid gap-1.5">
              <Label>PC</Label>
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
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={20}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="bg-background"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="language">Language</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as ItemLanguage)}>
                <SelectTrigger id="language" className="bg-background">
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

          {sportsCardItemId && variants.length > 1 && (
            <div className="grid gap-1.5">
              <Label htmlFor="variant">Parallel / refractor</Label>
              <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                <SelectTrigger id="variant" className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {variants.map((v) => (
                    <SelectItem key={v.sportsCardItemId} value={v.sportsCardItemId}>
                      {v.parallelName ? `${v.parallelName}${v.serialLimit ? ` /${v.serialLimit}` : ""}` : "Base"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showCopyNumberField && (
            <div className="grid gap-1.5">
              <Label htmlFor="copyNumber">Which copy do you have?</Label>
              <Input
                id="copyNumber"
                placeholder={`e.g. 14 of /${selectedVariant?.serialLimit}`}
                value={copyNumber}
                onChange={(e) => setCopyNumber(e.target.value)}
                className="bg-background"
              />
            </div>
          )}

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
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="sealed" /> Sealed
              </label>
            </RadioGroup>
          </div>

          {condition === "graded" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="gradeCompany">Grading co.</Label>
                <Input
                  id="gradeCompany"
                  value={gradeCompany}
                  onChange={(e) => setGradeCompany(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="gradeValue">Grade</Label>
                <Input
                  id="gradeValue"
                  value={gradeValue}
                  onChange={(e) => setGradeValue(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>
          )}

          {condition === "raw" && (
            <div className="grid gap-1.5">
              <Label htmlFor="rawCondition">Condition</Label>
              <Select
                value={rawCondition}
                onValueChange={(v) => setRawCondition(v as RawCardCondition)}
              >
                <SelectTrigger id="rawCondition" className="bg-background">
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
            id="holding-image"
            label="Photo of your card (optional)"
            helperText="Shown instead of the catalog image throughout your PC."
            value={imageUrl}
            onChange={setImageUrl}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="costBasis">Cost basis</Label>
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
                  id="costBasis"
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
              <Label htmlFor="acquiredAt">Acquired on</Label>
              <Input
                id="acquiredAt"
                type="date"
                value={acquiredAt}
                onChange={(e) => setAcquiredAt(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="acquisitionMethod">How obtained</Label>
              <Select
                value={acquisitionMethod}
                onValueChange={(v) => setAcquisitionMethod(v as AcquisitionMethod)}
              >
                <SelectTrigger id="acquisitionMethod" className="bg-background">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  {ACQUISITION_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {ACQUISITION_METHOD_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="acquiredFrom">Obtained from</Label>
              <Input
                id="acquiredFrom"
                placeholder="Seller, shop, or trade partner (optional)"
                value={acquiredFrom}
                onChange={(e) => setAcquiredFrom(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>

          {acquisitionMethod === "other" && (
            <div className="grid gap-1.5">
              <Label htmlFor="acquisitionNotes">Tell us more</Label>
              <Textarea
                id="acquisitionNotes"
                placeholder="How this card came into your possession"
                value={acquisitionNotes}
                onChange={(e) => setAcquisitionNotes(e.target.value)}
                className="bg-background"
              />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-negative">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={submitting}>
            {submitting ? "Adding…" : addButtonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
