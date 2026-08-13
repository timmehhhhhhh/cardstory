"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { usePortfolioStore } from "@/lib/portfolio/store";

export function PortfolioSelector() {
  const portfolios = usePortfolioStore((s) => s.portfolios);
  const activePortfolioId = usePortfolioStore((s) => s.activePortfolioId);
  const setActivePortfolio = usePortfolioStore((s) => s.setActivePortfolio);
  const createPortfolio = usePortfolioStore((s) => s.createPortfolio);

  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState("");

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = createPortfolio(trimmed);
    setActivePortfolio(id);
    setName("");
    setCreating(false);
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={activePortfolioId} onValueChange={setActivePortfolio}>
        <SelectTrigger className="w-40 bg-surface border-border">
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
      <Button variant="outline" size="icon" aria-label="New portfolio" onClick={() => setCreating(true)}>
        <Plus className="size-4" />
      </Button>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="bg-surface border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New portfolio</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Vintage, Sealed, Trade Binder"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="bg-background"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
