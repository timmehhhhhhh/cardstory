"use client";

import * as React from "react";
import Link from "next/link";
import { Check, PackagePlus, ShoppingBag, Star, Store, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardImage } from "@/components/cards/card-image";
import { GameBadge } from "@/components/cards/game-badge";
import { CardNumberBadge } from "@/components/cards/card-number-badge";
import { FinishBadge } from "@/components/cards/finish-badge";
import { DomainIcon } from "@/components/cards/riftbound-icons";
import { AddHoldingDialog } from "@/components/pc/add-holding-dialog";
import { usePCStore } from "@/lib/pc/store";
import { useAddToShortlist } from "@/lib/shortlist/use-add-to-shortlist";
import { formatMoney, formatPct } from "@/lib/utils/format";
import { getGameMeta } from "@/lib/games/registry";
import { isItemLanguage } from "@/lib/pc/language";
import { cardDetailHref } from "@/lib/catalog/card-href";
import { withEnglishName } from "@/lib/catalog/card-name";
import { holdingIsArchived } from "@/lib/pc/types";
import type { CatalogSearchItem } from "@/lib/catalog/search";

export function CardTile({
  item,
  view = "grid",
}: {
  item: CatalogSearchItem;
  view?: "grid" | "list";
}) {
  const currency = usePCStore((s) => s.preferences.currency);
  const watchlistEntry = usePCStore((s) => s.watchlist.find((w) => w.itemId === item.id));
  const watchlisted = !!watchlistEntry;
  const toggleWatchlist = usePCStore((s) => s.toggleWatchlist);
  const businessMode = usePCStore((s) => s.preferences.businessMode);
  const ensureBusinessPC = usePCStore((s) => s.ensureBusinessPC);
  const quickAdd = usePCStore((s) => s.preferences.quickAdd);
  const activePCId = usePCStore((s) => s.activePCId);
  const addHolding = usePCStore((s) => s.addHolding);
  const lastUsedCostBasisCurrency = usePCStore((s) => s.preferences.lastUsedCostBasisCurrency);

  const positive = (item.priceChangePct ?? 0) >= 0;
  const isSports = getGameMeta(item.gameId)?.kind === "sports";
  const href = cardDetailHref(item.gameId, item.id, isSports);
  // Summed across every PC (not just the active one) — a card already
  // owned in another collection should still read as "owned" here.
  const ownedQuantity = usePCStore((s) =>
    s.pcs.reduce(
      (total, pc) =>
        total +
        pc.holdings.reduce((sum, h) => {
          if (holdingIsArchived(h)) return sum;
          const matches = isSports ? h.sportsCardItemId === item.id : h.catalogItemId === item.id;
          return matches ? sum + h.quantity : sum;
        }, 0),
      0
    )
  );
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [businessDialogOpen, setBusinessDialogOpen] = React.useState(false);
  const [businessPCId, setBusinessPCId] = React.useState<string | undefined>(undefined);
  const addToShortlist = useAddToShortlist();
  // Brief post-click acknowledgment — repeat adds are legitimate (the same
  // card spotted at two shops), so this is a pulse, not an "already
  // shortlisted" toggle state like the watchlist star.
  const [justShortlisted, setJustShortlisted] = React.useState(false);
  // Same pulse pattern as justShortlisted, for the Quick Add bypass below.
  const [justQuickAdded, setJustQuickAdded] = React.useState(false);
  // Only surfaced for non-English prints (currently Pokémon JP/CN/TW/KR) —
  // otherwise identical-looking reprints in different languages are
  // indistinguishable in a flat grid.
  const nonEnglishLanguage =
    isItemLanguage(item.language) && item.language !== "EN" ? item.language : undefined;
  const languageBadge = nonEnglishLanguage && (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-muted-foreground bg-surface-elevated border border-border">
      {nonEnglishLanguage}
    </span>
  );
  // Qualifies the Add-to-Collection dialog's card name with the variation
  // (e.g. "Charizard — Reverse Holo") so the confirmation is unambiguous —
  // the whole point of splitting finishes into separate tiles is defeated
  // if the dialog you add one from doesn't say which finish you're adding.
  const displayName = withEnglishName(
    item.variantLabel ? `${item.name} — ${item.variantLabel}` : item.name,
    item.nameEn
  );

  // The whole tile is a "stretched link" (a full-bleed <Link> layered
  // beneath everything, see below) rather than the action buttons living
  // inside a wrapping <Link>. Nesting interactive controls inside a <Link>
  // means their clicks have to fight the link for the event — even a
  // `preventDefault` that stops the immediate navigation can leave Next's
  // router with a scheduled-but-uncommitted transition that fires later
  // (e.g. when the dialog closes and hands focus back to the trigger).
  // Structuring these as siblings avoids that class of bug entirely.
  // When Quick Add is on, this skips AddHoldingDialog entirely and drops
  // the card straight into `targetPCId` with default values — no
  // quantity/condition/date to fill in. Business mode and Quick Add now
  // compose: Business mode picks the destination PC (Business Inventory
  // vs. whichever personal PC is active), Quick Add decides whether the
  // dialog is skipped to get there — see the two call sites below.
  async function handleQuickAdd(targetPCId: string) {
    try {
      await addHolding(targetPCId, {
        kind: isSports ? "sports" : "tcg",
        catalogItemId: isSports ? undefined : item.id,
        sportsCardItemId: isSports ? item.id : undefined,
        quantity: 1,
        condition: "raw",
        language: nonEnglishLanguage ?? "EN",
        costBasisTotal: 0,
        costBasisCurrency: lastUsedCostBasisCurrency ?? "USD",
        priceAtAcquisition: null,
        acquiredAt: null,
      });
      setJustQuickAdded(true);
      setTimeout(() => setJustQuickAdded(false), 1200);
    } catch (err) {
      // No dialog to surface an error in — fire-and-forget, same as the
      // LaMelo checklist's quick-check flow.
      console.error("Quick add failed", err);
    }
  }

  const addToCollectionTrigger = (className: string) => (
    // `relative z-10 flex-none` lives on this wrapper (not just the button
    // below) so it still stacks above the full-bleed Link and holds its
    // size in the list view's flex row now that the button isn't the
    // direct flex child anymore.
    <span className="relative z-10 inline-flex flex-none">
      <button
        type="button"
        aria-label="Add to collection"
        onClick={() => {
          if (quickAdd) void handleQuickAdd(businessMode ? ensureBusinessPC() : activePCId);
          else setAddDialogOpen(true);
        }}
        className={className}
      >
        {justQuickAdded ? (
          <Check className="size-3.5 text-positive" />
        ) : (
          <PackagePlus className="size-3.5" />
        )}
      </button>
      {ownedQuantity > 0 && (
        <span
          aria-label={`${ownedQuantity} in your collection`}
          className="pointer-events-none absolute -right-1 -top-1 z-10 flex h-4 min-w-4 items-center justify-center rounded-full border border-border bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground"
        >
          {ownedQuantity > 99 ? "99+" : ownedQuantity}
        </span>
      )}
    </span>
  );

  // Vendor-only quick-add, shown alongside the general Add trigger while
  // Business mode is on (see business-mode-toggle.tsx) — guarantees the
  // card lands in the Business Inventory pc with no PC picker to get
  // wrong, unlike the general Add dialog which only *defaults* there. When
  // the Quick Add toggle is also on, this bypasses its own dialog too —
  // same "skip the dialog" behavior as the general trigger above, just
  // always targeting Business Inventory regardless of which PC is active.
  const addToBusinessInventoryTrigger = (className: string) => (
    <button
      type="button"
      aria-label="Add to Business Inventory"
      title="Add to Business Inventory"
      onClick={() => {
        // Re-ensured here (idempotent) in case the Business Inventory pc
        // was deleted after Business mode was switched on.
        const targetPCId = ensureBusinessPC();
        if (quickAdd) void handleQuickAdd(targetPCId);
        else {
          setBusinessPCId(targetPCId);
          setBusinessDialogOpen(true);
        }
      }}
      className={className}
    >
      <Store className="size-3.5" />
    </button>
  );

  const watchlistTitle = watchlisted
    ? `Watching since ${new Date(watchlistEntry!.addedAt).toLocaleDateString()}${
        watchlistEntry!.priceAtAdd != null ? ` · ${formatMoney(watchlistEntry!.priceAtAdd, currency)} at add` : ""
      }`
    : undefined;

  const watchlistTrigger = (className: string) => (
    <button
      type="button"
      aria-label={watchlisted ? "Remove from watchlist" : "Add to watchlist"}
      aria-pressed={watchlisted}
      title={watchlistTitle}
      onClick={() => toggleWatchlist(item.id, isSports ? "sports" : "tcg", item.priceRaw)}
      className={className}
    >
      <Star className={cn("size-4", watchlisted && "fill-watchlist text-watchlist")} />
    </button>
  );

  const shortlistTrigger = (className: string) => (
    <button
      type="button"
      aria-label="Add to shortlist"
      title="Add to shortlist"
      onClick={() => {
        addToShortlist({
          kind: isSports ? "sports" : "tcg",
          catalogItemId: isSports ? undefined : item.id,
          sportsCardItemId: isSports ? item.id : undefined,
          source: "Explore",
        });
        setJustShortlisted(true);
        setTimeout(() => setJustShortlisted(false), 1200);
      }}
      className={className}
    >
      {justShortlisted ? (
        <Check className="size-3.5 text-positive" />
      ) : (
        <ShoppingBag className="size-3.5" />
      )}
    </button>
  );

  const dialog = (
    <AddHoldingDialog
      catalogItemId={isSports ? undefined : item.id}
      sportsCardItemId={isSports ? item.id : undefined}
      cardName={displayName}
      suggestedPrice={item.priceRaw}
      defaultLanguage={nonEnglishLanguage}
      open={addDialogOpen}
      onOpenChange={setAddDialogOpen}
    />
  );

  const businessDialog = (
    <AddHoldingDialog
      catalogItemId={isSports ? undefined : item.id}
      sportsCardItemId={isSports ? item.id : undefined}
      cardName={displayName}
      suggestedPrice={item.priceRaw}
      defaultLanguage={nonEnglishLanguage}
      open={businessDialogOpen}
      onOpenChange={setBusinessDialogOpen}
      forcedPCId={businessPCId}
      title="Add to Business Inventory"
    />
  );

  if (view === "list") {
    return (
      <div className="relative flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 transition-colors hover:bg-surface-elevated">
        <Link href={href} aria-label={item.name} className="absolute inset-0 z-0" />
        <div className="pointer-events-none relative h-14 w-10 flex-none overflow-hidden rounded bg-muted">
          <CardImage
            src={item.imageSmallUrl}
            alt=""
            sizes="40px"
            className="object-contain"
          />
        </div>
        <div className="pointer-events-none min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="min-w-0 truncate text-sm font-medium">{item.name}</p>
            <FinishBadge variantKey={item.variantKey} label={item.variantLabel} className="flex-none" />
            <CardNumberBadge number={item.number} className="flex-none" />
            {item.domain.length > 0 && (
              <span className="flex flex-none items-center gap-0.5">
                {item.domain.map((d) => (
                  <DomainIcon key={d} domain={d} />
                ))}
              </span>
            )}
          </div>
          {item.nameEn && <p className="truncate text-xs text-muted-foreground">{item.nameEn}</p>}
          <p className="truncate text-xs text-muted-foreground">
            {item.setNameEn ? `${item.setName} (${item.setNameEn})` : item.setName}
            {item.artist ? ` · ${item.artist}` : ""}
          </p>
        </div>
        <div className="pointer-events-none hidden items-center gap-1 sm:flex">
          <GameBadge gameId={item.gameId} />
          {languageBadge}
        </div>
        <div className="pointer-events-none w-24 flex-none text-right">
          <p className="num-tabular text-sm font-semibold">{formatMoney(item.priceRaw, currency)}</p>
          {item.priceChangePct != null && (
            <p className={cn("num-tabular text-xs", positive ? "text-positive" : "text-negative")}>
              {formatPct(item.priceChangePct)}
            </p>
          )}
        </div>
        {addToCollectionTrigger(
          "relative z-10 flex-none rounded-md p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-primary"
        )}
        {businessMode &&
          addToBusinessInventoryTrigger(
            "relative z-10 flex-none rounded-md p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-primary"
          )}
        {dialog}
        {businessDialog}
        {shortlistTrigger(
          "relative z-10 flex-none rounded-md p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-primary"
        )}
        {watchlistTrigger(
          "relative z-10 flex-none rounded-md p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-watchlist"
        )}
      </div>
    );
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-primary/40 hover:bg-surface-elevated">
      <Link href={href} aria-label={item.name} className="absolute inset-0 z-0" />
      <div className="pointer-events-none relative aspect-[5/7] w-full bg-muted">
        <CardImage
          src={item.imageSmallUrl}
          alt={item.name}
          sizes="(min-width:1280px) 220px, (min-width:768px) 25vw, 45vw"
          className="object-contain p-2"
          fallbackVariant="icon-label"
        />
        <CardNumberBadge number={item.number} variant="overlay" />
        <FinishBadge
          variantKey={item.variantKey}
          label={item.variantLabel}
          variant="overlay"
          className="left-1.5 top-[26px]"
        />
        <div className="pointer-events-auto absolute right-1.5 top-1.5 z-10 flex flex-col gap-1">
          {addToCollectionTrigger(
            "rounded-full bg-background/70 p-1.5 text-muted-foreground backdrop-blur transition-colors hover:text-primary"
          )}
          {businessMode &&
            addToBusinessInventoryTrigger(
              "rounded-full bg-background/70 p-1.5 text-muted-foreground backdrop-blur transition-colors hover:text-primary"
            )}
          {shortlistTrigger(
            "rounded-full bg-background/70 p-1.5 text-muted-foreground backdrop-blur transition-colors hover:text-primary"
          )}
          {watchlistTrigger(
            "rounded-full bg-background/70 p-1.5 text-muted-foreground backdrop-blur transition-colors hover:text-watchlist"
          )}
        </div>
        {item.hasPrice && (
          <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between rounded-md bg-background/80 px-1.5 py-1 backdrop-blur">
            <span className="num-tabular text-xs font-semibold">
              {formatMoney(item.priceRaw, currency)}
            </span>
            {item.priceChangePct != null && (
              <span
                className={cn(
                  "flex items-center gap-0.5 text-[10px] font-medium",
                  positive ? "text-positive" : "text-negative"
                )}
              >
                {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {formatPct(item.priceChangePct)}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="pointer-events-none flex flex-col gap-0.5 p-2.5">
        <div className="flex items-center gap-1.5">
          <p className="min-w-0 truncate text-sm font-medium leading-tight">{item.name}</p>
          {languageBadge}
        </div>
        {item.nameEn && <p className="truncate text-[11px] text-muted-foreground">{item.nameEn}</p>}
        <p className="truncate text-xs text-muted-foreground">
          {item.setNameEn ? `${item.setName} (${item.setNameEn})` : item.setName}
        </p>
        {item.cardType && <p className="truncate text-[11px] text-muted-foreground/80">{item.cardType}</p>}
        {item.artist && <p className="truncate text-[11px] text-muted-foreground/80">{item.artist}</p>}
        {item.domain.length > 0 && (
          <span className="flex items-center gap-0.5">
            {item.domain.map((d) => (
              <DomainIcon key={d} domain={d} />
            ))}
          </span>
        )}
      </div>
      {dialog}
      {businessDialog}
    </div>
  );
}
