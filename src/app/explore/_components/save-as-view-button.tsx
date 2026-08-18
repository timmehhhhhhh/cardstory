"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useViewsMutations } from "@/hooks/use-views";
import { exploreFiltersToViewFilters } from "@/lib/views/filters";
import type { ExploreFilters } from "@/app/explore/_components/types";

/**
 * Captures the current Explore filter bar as a new named View (see
 * src/app/views). No toast library exists in this codebase — createView
 * writes straight into the shared ["views"] React Query cache
 * optimistically, so redirecting to /views is enough feedback: the new
 * card is already there when it renders.
 */
export function SaveAsViewButton({ filters }: { filters: ExploreFilters }) {
  const router = useRouter();
  const { createView } = useViewsMutations();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    createView(trimmed, exploreFiltersToViewFilters(filters));
    setName("");
    setOpen(false);
    router.push("/views");
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Bookmark className="size-3.5" /> Save as View
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-surface border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save current search as a View</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Munchlax cards"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="bg-background"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
