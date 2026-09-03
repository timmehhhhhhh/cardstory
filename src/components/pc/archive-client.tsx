"use client";

import * as React from "react";
import Link from "next/link";
import { ArchiveIcon, ArrowLeft, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CardImage } from "@/components/cards/card-image";
import { CardNumberBadge } from "@/components/cards/card-number-badge";
import { ParallelBadge } from "@/components/sportscards/parallel-badge";
import { ArchiveDetailsDialog } from "@/components/pc/archive-details-dialog";
import { useArchiveData, type ArchivedRow } from "@/hooks/use-archive-data";
import { usePCStore } from "@/lib/pc/store";
import { formatMoneyIn } from "@/lib/utils/format";
import { usePricingVisible } from "@/lib/utils/use-pricing-visible";
import { LET_GO_METHOD_LABELS } from "@/lib/constants";
import type { PCKind } from "@/lib/pc/types";
import type { LetGoDetails } from "@/lib/pc/api-schemas";

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function letGoSummary(row: ArchivedRow, pricingVisible: boolean): string | null {
  const parts: string[] = [];
  if (row.letGoMethod) parts.push(LET_GO_METHOD_LABELS[row.letGoMethod]);
  if (row.letGoTo) parts.push(`to ${row.letGoTo}`);
  if (pricingVisible && row.letGoAmount != null)
    parts.push(`for ${formatMoneyIn(row.letGoAmount, row.letGoCurrency ?? "USD")}`);
  return parts.length > 0 ? parts.join(" ") : null;
}

function ArchivedCardRow({
  row,
  onEdit,
  onRestore,
  onDeleteForever,
}: {
  row: ArchivedRow;
  onEdit: (row: ArchivedRow) => void;
  onRestore: (row: ArchivedRow) => void;
  onDeleteForever: (row: ArchivedRow) => void;
}) {
  const pricingVisible = usePricingVisible();
  const summary = letGoSummary(row, pricingVisible);

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3 sm:gap-4 sm:p-4">
      <div className="relative aspect-[5/7] w-20 flex-none overflow-hidden rounded-lg bg-muted ring-1 ring-border/60 sm:w-24">
        <CardImage
          src={row.display.imageUrl}
          alt=""
          sizes="(min-width: 640px) 96px, 80px"
          className="object-contain grayscale-[35%]"
          overlay={
            row.display.imageWatermark ? (
              <ParallelBadge
                parallelName={row.display.imageWatermark.parallelName}
                serialLimit={row.display.imageWatermark.serialLimit}
                inherited={row.display.imageWatermark.inherited}
              />
            ) : undefined
          }
        />
      </div>

      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm leading-snug font-medium sm:text-base">{row.display.name}</p>
          <CardNumberBadge number={row.display.number} />
        </div>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground sm:text-sm">{row.display.subtitle}</p>

        <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
          Archived {row.archivedAt ? dayLabel(row.archivedAt) : "—"}
          {row.letGoAt && row.letGoAt.slice(0, 10) !== row.archivedAt?.slice(0, 10)
            ? ` · left the collection ${dayLabel(row.letGoAt)}`
            : ""}
        </p>
        <p className="mt-0.5 text-xs leading-snug">
          {summary ? (
            <span className="text-foreground/80">{summary}</span>
          ) : (
            <span className="text-muted-foreground italic">No let-go details added yet</span>
          )}
        </p>
        {row.letGoNotes && <p className="mt-0.5 text-xs leading-snug text-muted-foreground">“{row.letGoNotes}”</p>}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="font-normal text-muted-foreground">
            Qty {row.quantity}
          </Badge>
          <Badge variant="outline" className="font-normal text-muted-foreground">
            {row.display.groupLabel}
          </Badge>
          <Badge variant="outline" className="font-normal text-muted-foreground">
            from {row.pcName}
          </Badge>
        </div>
      </div>

      <div className="flex flex-none flex-col items-end gap-1.5 self-stretch">
        <button
          type="button"
          aria-label="Edit archive details"
          title="Edit archive details"
          onClick={() => onEdit(row)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Restore to PC"
          title="Restore to PC"
          onClick={() => onRestore(row)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-positive"
        >
          <RotateCcw className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Delete forever"
          title="Delete forever"
          onClick={() => onDeleteForever(row)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-negative"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

function EmptyArchive({ scopeKind }: { scopeKind: PCKind }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-16 text-center">
      <ArchiveIcon className="mb-1 size-6 text-muted-foreground" />
      <p className="font-medium">No archived cards yet</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Cards you remove from a {scopeKind === "business" ? "Business Inventory" : "PC"} land here instead of
        disappearing — how they entered your collection stays on record, and you can document who or what they went
        to whenever a card turns out to matter to you.
      </p>
    </div>
  );
}

/**
 * PC Archives / Business Archives — a recycle bin for cards removed from a
 * pc, scrollable by Date Archived (grouped under month headers, newest
 * first). See src/hooks/use-archive-data.ts for the data source and
 * src/lib/pc/manage.ts's archiveHoldings for what's preserved.
 */
export function ArchiveClient({
  scopeKind,
  title,
  backHref,
  backLabel,
}: {
  scopeKind: PCKind;
  title: string;
  backHref: string;
  backLabel: string;
}) {
  const { rows, isLoading } = useArchiveData(scopeKind);
  const updateHolding = usePCStore((s) => s.updateHolding);
  const removeHoldings = usePCStore((s) => s.removeHoldings);

  const [editing, setEditing] = React.useState<ArchivedRow | null>(null);

  function handleRestore(row: ArchivedRow) {
    if (!window.confirm(`Restore "${row.display.name}" to ${row.pcName}?`)) return;
    updateHolding(row.pcId, row.id, {
      archivedAt: null,
      letGoAt: null,
      letGoMethod: undefined,
      letGoTo: undefined,
      letGoAmount: null,
      letGoCurrency: undefined,
      letGoNotes: undefined,
    });
  }

  function handleDeleteForever(row: ArchivedRow) {
    if (!window.confirm(`Permanently delete "${row.display.name}"? This can't be undone.`)) return;
    removeHoldings(row.pcId, [row.id]);
  }

  const groups = React.useMemo(() => {
    const map = new Map<string, ArchivedRow[]>();
    for (const row of rows) {
      const key = row.archivedAt ? row.archivedAt.slice(0, 7) : "unknown";
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [rows]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
      <div className="flex items-center gap-2">
        <Link
          href={backHref}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {backLabel}
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <ArchiveIcon className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading archive…</p>
      ) : rows.length === 0 ? (
        <EmptyArchive scopeKind={scopeKind} />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(([monthKey, monthRows]) => (
            <div key={monthKey} className="flex flex-col gap-2.5">
              <h2 className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-1.5 text-sm font-semibold text-muted-foreground backdrop-blur sm:-mx-6 sm:px-6">
                {monthRows[0].archivedAt ? monthLabel(monthRows[0].archivedAt) : "Unknown date"}
              </h2>
              {monthRows.map((row) => (
                <ArchivedCardRow
                  key={row.id}
                  row={row}
                  onEdit={setEditing}
                  onRestore={handleRestore}
                  onDeleteForever={handleDeleteForever}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <ArchiveDetailsDialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title="Edit archive details"
        description={editing?.display.name}
        initial={
          editing
            ? {
                letGoAt: editing.letGoAt ?? undefined,
                letGoMethod: editing.letGoMethod,
                letGoTo: editing.letGoTo,
                letGoAmount: editing.letGoAmount,
                letGoCurrency: editing.letGoCurrency,
                letGoNotes: editing.letGoNotes,
              }
            : undefined
        }
        submitLabel="Save changes"
        onSubmit={(letGo: LetGoDetails) => {
          if (!editing) return;
          updateHolding(editing.pcId, editing.id, letGo);
          setEditing(null);
        }}
      />
    </div>
  );
}
