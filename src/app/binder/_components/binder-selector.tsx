"use client";

import * as React from "react";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useBinderStore } from "@/lib/binder/store";
import { LayoutPicker } from "@/app/binder/_components/layout-picker";
import type { BinderLayoutId } from "@/lib/binder/types";

export function BinderSelector() {
  const binders = useBinderStore((s) => s.binders);
  const activeBinderId = useBinderStore((s) => s.activeBinderId);
  const activeBinder = binders.find((b) => b.id === activeBinderId);
  const setActiveBinder = useBinderStore((s) => s.setActiveBinder);
  const createBinder = useBinderStore((s) => s.createBinder);
  const renameBinder = useBinderStore((s) => s.renameBinder);
  const deleteBinder = useBinderStore((s) => s.deleteBinder);
  const setStatus = useBinderStore((s) => s.setStatus);

  const [creating, setCreating] = React.useState(false);
  const [renaming, setRenaming] = React.useState(false);
  const [name, setName] = React.useState("");
  const [layoutId, setLayoutId] = React.useState<BinderLayoutId>("9");

  function openCreate() {
    setName("");
    setLayoutId("9");
    setCreating(true);
  }

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newId = createBinder(trimmed, layoutId);
    setActiveBinder(newId);
    setCreating(false);
  }

  function openRename() {
    setName(activeBinder?.name ?? "");
    setRenaming(true);
  }

  function handleRename() {
    const trimmed = name.trim();
    if (!trimmed || !activeBinderId) return;
    renameBinder(activeBinderId, trimmed);
    setRenaming(false);
  }

  function handleDelete() {
    if (!activeBinderId) return;
    if (binders.length <= 1) return;
    if (!window.confirm(`Delete "${activeBinder?.name}"? This only removes the mockup layout, not your cards.`)) return;
    deleteBinder(activeBinderId);
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={activeBinderId} onValueChange={setActiveBinder}>
        <SelectTrigger className="w-40 bg-surface border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {binders.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {activeBinder && (
        <button
          type="button"
          aria-pressed={activeBinder.status === "live"}
          title={
            activeBinder.status === "live"
              ? "LIVE — this binder matches your physical binder right now. Click to mark as WIP."
              : "WIP — you're still arranging this binder. Click to mark as LIVE."
          }
          onClick={() => setStatus(activeBinder.id, activeBinder.status === "live" ? "wip" : "live")}
        >
          <Badge
            variant={activeBinder.status === "live" ? "default" : "outline"}
            className={cn(
              "cursor-pointer",
              activeBinder.status === "live" && "bg-positive text-white border-transparent"
            )}
          >
            {activeBinder.status === "live" ? "LIVE" : "WIP"}
          </Badge>
        </button>
      )}

      <Button variant="outline" size="icon" aria-label="New binder" onClick={openCreate}>
        <Plus className="size-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Binder options">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={openRename}>
            <Pencil className="size-4" />
            Rename binder
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" disabled={binders.length <= 1} onSelect={handleDelete}>
            <Trash2 className="size-4" />
            Delete binder
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="bg-surface border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New binder</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Vintage Binder, Pokémon Set Run"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="bg-background"
          />
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">Pocket layout</p>
            <LayoutPicker value={layoutId} onChange={setLayoutId} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent className="bg-surface border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename binder</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            className="bg-background"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
