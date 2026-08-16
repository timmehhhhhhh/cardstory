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
import { CardPhotoField } from "@/components/portfolio/card-photo-field";
import { usePortfolioStore } from "@/lib/portfolio/store";
import type { CardCondition, ItemLanguage } from "@/lib/portfolio/types";

export function AddHoldingDialog({
  catalogItemId,
  sportsCardItemId,
  cardName,
  suggestedPrice,
  defaultLanguage = "EN",
  trigger,
  open: openProp,
  onOpenChange,
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
}) {
  const isControlled = openProp !== undefined;
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = isControlled ? openProp : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;
  const [quantity, setQuantity] = React.useState(1);
  const [condition, setCondition] = React.useState<CardCondition>("raw");
  const [gradeCompany, setGradeCompany] = React.useState("PSA");
  const [gradeValue, setGradeValue] = React.useState("10");
  const [language, setLanguage] = React.useState<ItemLanguage>(defaultLanguage);
  const [costBasis, setCostBasis] = React.useState(suggestedPrice?.toFixed(2) ?? "");
  const [acquiredAt, setAcquiredAt] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [imageUrl, setImageUrl] = React.useState("");

  const portfolios = usePortfolioStore((s) => s.portfolios);
  const activePortfolioId = usePortfolioStore((s) => s.activePortfolioId);
  const [portfolioId, setPortfolioId] = React.useState(activePortfolioId);
  const addHolding = usePortfolioStore((s) => s.addHolding);

  // Re-default the target portfolio (and Language, from the catalog item's
  // own print language) each time the dialog opens — adjusted during render
  // (not in an effect) per https://react.dev/learn/you-might-not-need-an-effect.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPortfolioId(activePortfolioId);
      setLanguage(defaultLanguage);
    }
  }

  function handleAdd() {
    addHolding(portfolioId, {
      kind: sportsCardItemId ? "sports" : "tcg",
      catalogItemId,
      sportsCardItemId,
      quantity: Math.max(1, quantity),
      condition,
      gradeCompany: condition === "graded" ? gradeCompany : undefined,
      gradeValue: condition === "graded" ? gradeValue : undefined,
      language,
      costBasisTotal: Number(costBasis) || 0,
      costBasisCurrency: "USD",
      acquiredAt: new Date(acquiredAt).toISOString(),
      imageUrl: imageUrl.trim() || undefined,
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button className="w-full">
              <PackagePlus className="size-4" /> Add to Portfolio
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="bg-surface border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Portfolio</DialogTitle>
          <DialogDescription>{cardName}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {portfolios.length > 1 && (
            <div className="grid gap-1.5">
              <Label>Portfolio</Label>
              <Select value={portfolioId} onValueChange={setPortfolioId}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {portfolios.map((p) => (
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

          <CardPhotoField
            id="holding-image"
            label="Photo of your card (optional)"
            helperText="Shown instead of the catalog image throughout your portfolio."
            value={imageUrl}
            onChange={setImageUrl}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="costBasis">Cost basis (USD)</Label>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd}>Add to Portfolio</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
