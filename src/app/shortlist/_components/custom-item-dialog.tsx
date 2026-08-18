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
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from "@/lib/constants";
import { useShortlistStore } from "@/lib/shortlist/store";
import { usePCStore } from "@/lib/pc/store";

/**
 * Keys in a card that isn't in either catalog — the whole point of the
 * shortlist being usable in a shop, where plenty of what's in the case
 * (sealed lots, oddball promos, anything from a game we haven't wired) will
 * never come back from a search.
 */
export function CustomItemDialog({
  open,
  onOpenChange,
  initialName = "",
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefilled when opened from the "add <query> as a custom item" search row. */
  initialName?: string;
  onAdded?: (itemId: string) => void;
}) {
  const addShortlistItem = useShortlistStore((s) => s.addShortlistItem);
  const lastUsedCostBasisCurrency = usePCStore((s) => s.preferences.lastUsedCostBasisCurrency);

  const [name, setName] = React.useState(initialName);
  const [subtitle, setSubtitle] = React.useState("");
  const [quantity, setQuantity] = React.useState(1);
  const [price, setPrice] = React.useState("");
  const [currency, setCurrency] = React.useState<SupportedCurrency>(lastUsedCostBasisCurrency ?? "USD");
  const [error, setError] = React.useState<string | null>(null);

  // Re-seed the form each time the dialog opens — adjusted during render,
  // not in an effect, same as AddHoldingDialog.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName(initialName);
      setSubtitle("");
      setQuantity(1);
      setPrice("");
      setCurrency(lastUsedCostBasisCurrency ?? "USD");
      setError(null);
    }
  }

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give this item a name so you can recognise it later.");
      return;
    }
    const newId = addShortlistItem({
      kind: "custom",
      customName: trimmed,
      customSubtitle: subtitle.trim() || undefined,
      quantity: Math.max(1, quantity),
      askingPrice: Number(price) || 0,
      askingCurrency: currency,
    });
    onOpenChange(false);
    onAdded?.(newId);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a custom item</DialogTitle>
          <DialogDescription>
            For something you&apos;ve spotted that isn&apos;t in the catalog. Type whatever you&apos;ll recognise
            it by.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="custom-name">Name</Label>
            <Input
              id="custom-name"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Charizard jumbo promo"
              className="bg-background"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="custom-subtitle">Details (optional)</Label>
            <Input
              id="custom-subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g. 2020 Prizm · #5 · sealed"
              className="bg-background"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="custom-quantity">Quantity</Label>
              <Input
                id="custom-quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="bg-background"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="custom-price">Asking price (each)</Label>
              <div className="flex gap-2">
                <Select value={currency} onValueChange={(v) => setCurrency(v as SupportedCurrency)}>
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
                  id="custom-price"
                  type="number"
                  step="0.01"
                  min={0}
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="num-tabular bg-background"
                />
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-negative">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd}>Add to shortlist</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
