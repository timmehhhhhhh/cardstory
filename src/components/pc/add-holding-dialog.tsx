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
} from "@/lib/constants";
import { pcKind, type CardCondition, type ItemLanguage } from "@/lib/pc/types";
import { resolvePriceAtDate } from "@/lib/pc/resolve-price-at-date";

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
  const [costBasis, setCostBasis] = React.useState(suggestedPrice?.toFixed(2) ?? "");
  // Empty by default — Date Acquired is only ever set explicitly by the
  // user, not silently defaulted to today (see prisma/schema.prisma).
  const [acquiredAt, setAcquiredAt] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
  const addHolding = usePCStore((s) => s.addHolding);
  const lastUsedCostBasisCurrency = usePCStore(
    (s) => s.preferences.lastUsedCostBasisCurrency
  );
  const setLastUsedCostBasisCurrency = usePCStore((s) => s.setLastUsedCostBasisCurrency);
  const [costBasisCurrency, setCostBasisCurrency] = React.useState<SupportedCurrency>(
    lastUsedCostBasisCurrency ?? "USD"
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
      setCostBasisCurrency(lastUsedCostBasisCurrency ?? "USD");
      setRawCondition("");
      setAcquiredAt("");
      setError(null);
    }
  }

  async function handleAdd() {
    setSubmitting(true);
    setError(null);
    try {
      const priceAtAcquisition = await resolvePriceAtDate({
        date: acquiredAt || null,
        liveSuggestedPrice: suggestedPrice,
        catalogItemId,
        sportsCardItemId,
      });
      await addHolding(pcId, {
        kind: sportsCardItemId ? "sports" : "tcg",
        catalogItemId,
        sportsCardItemId,
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
        imageUrl: imageUrl.trim() || undefined,
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
              <PackagePlus className="size-4" /> Add to PC
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
        </div>

        {error && <p className="text-sm text-negative">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={submitting}>
            {submitting ? "Adding…" : "Add to PC"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
