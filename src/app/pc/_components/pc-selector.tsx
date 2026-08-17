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
import { usePCStore } from "@/lib/pc/store";

export function PCSelector() {
  const pcs = usePCStore((s) => s.pcs);
  const activePCId = usePCStore((s) => s.activePCId);
  const setActivePC = usePCStore((s) => s.setActivePC);
  const createPC = usePCStore((s) => s.createPC);

  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState("");

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = createPC(trimmed);
    setActivePC(id);
    setName("");
    setCreating(false);
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={activePCId} onValueChange={setActivePC}>
        <SelectTrigger className="w-40 bg-surface border-border">
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
      <Button variant="outline" size="icon" aria-label="New PC" onClick={() => setCreating(true)}>
        <Plus className="size-4" />
      </Button>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="bg-surface border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New PC</DialogTitle>
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
