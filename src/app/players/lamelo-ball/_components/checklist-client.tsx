"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import { CardImage } from "@/components/cards/card-image";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { usePCStore } from "@/lib/pc/store";
import type { ChecklistCard, ChecklistCardType, ChecklistVariant } from "@/lib/sportscards/manage";
import { holdingIsArchived, type ItemLanguage } from "@/lib/pc/types";

const CARD_TYPE_LABEL: Record<ChecklistCardType, string> = {
  base: "Base",
  insert: "Insert",
  short_print: "Short Print",
};

const CARD_TYPE_VARIANT: Record<ChecklistCardType, "outline" | "secondary" | "default"> = {
  base: "outline",
  insert: "secondary",
  short_print: "default",
};

/** Owns the Front/Back label and the fixed checklist thumbnail size; the
 *  image itself (and its missing/rotted handling) is the shared CardImage. */
function ChecklistCardImage({ url, label }: { url: string | null; label: "Front" | "Back" }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative aspect-[5/7] w-28 overflow-hidden rounded-md border border-border bg-surface-elevated sm:w-32">
        <CardImage
          src={url}
          alt={`${label} of card`}
          className="object-cover"
          fallbackVariant="icon-label"
        />
      </div>
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function ChecklistCardRow({ card }: { card: ChecklistCard }) {
  const activePCId = usePCStore((s) => s.activePCId);
  const pcs = usePCStore((s) => s.pcs);
  const addHolding = usePCStore((s) => s.addHolding);
  const archiveHoldings = usePCStore((s) => s.archiveHoldings);

  const activePC = pcs.find((p) => p.id === activePCId);
  const holdings = activePC?.holdings ?? [];

  // Archived holdings stick around in activePC.holdings (they're soft-deleted
  // into PC Archives, not removed) so they must be excluded here — otherwise
  // a card the user just unchecked/archived would still read as "owned" and
  // the checkbox would refuse to uncheck.
  function holdingIdsFor(sportsCardItemId: string) {
    return holdings
      .filter((h) => h.sportsCardItemId === sportsCardItemId && !holdingIsArchived(h))
      .map((h) => h.id);
  }

  function toggleOwned(variant: ChecklistVariant, owned: boolean) {
    if (owned) {
      // Archive rather than hard-delete — unchecking a card here is just
      // another "remove a card from the PC" affordance, same as the trash
      // icon on the main PC/Business pages, so it needs to land in PC
      // Archives / Business Archives instead of vanishing outright.
      archiveHoldings(activePCId, holdingIdsFor(variant.sportsCardItemId));
    } else {
      addHolding(activePCId, {
        kind: "sports",
        sportsCardItemId: variant.sportsCardItemId,
        quantity: 1,
        condition: "raw",
        language: "EN" as ItemLanguage,
        costBasisTotal: 0,
        costBasisCurrency: "USD",
        // acquiredAt is always "now" here (a checklist checkbox, not a
        // backdatable form), so the live price is also the price at
        // acquisition — no historical lookup needed.
        priceAtAcquisition: variant.priceRaw,
        acquiredAt: new Date().toISOString(),
        // Fire-and-forget, like archiveHoldings above — a failure already
        // rolls the optimistic add back out via reconcile() inside the
        // store (see useRemotePCStore.addHolding); this checkbox has no
        // form to keep open or error text to show, so just avoid an
        // unhandled-rejection warning.
      }).catch(() => {});
    }
  }

  const setLabel = [card.year, card.distributor, card.setName].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:flex-row">
      <div className="flex shrink-0 gap-3">
        <ChecklistCardImage url={card.imageUrl} label="Front" />
        <ChecklistCardImage url={card.imageBackUrl} label="Back" />
      </div>

      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">
            {setLabel}
            {card.cardNumber ? ` #${card.cardNumber}` : ""}
          </h3>
          <Badge variant={CARD_TYPE_VARIANT[card.cardType]}>{CARD_TYPE_LABEL[card.cardType]}</Badge>
        </div>
        {card.sourceUrl && (
          <a
            href={card.sourceUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Source <ExternalLink className="size-3" />
          </a>
        )}

        <div className="mt-3 flex flex-col gap-1.5">
          {card.variants.map((v) => {
            const owned = holdingIdsFor(v.sportsCardItemId).length > 0;
            return (
              <label
                key={v.sportsCardItemId}
                className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-surface-elevated"
              >
                <Checkbox
                  checked={owned}
                  onCheckedChange={() => toggleOwned(v, owned)}
                />
                <span>{v.parallelName}</span>
                {v.serialLimit && (
                  <span className="text-xs text-muted-foreground">/{v.serialLimit}</span>
                )}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function seasonLabel(year: number | null) {
  return year != null ? `${year}-${String((year + 1) % 100).padStart(2, "0")}` : "Unknown season";
}

export function ChecklistClient({ cards }: { cards: ChecklistCard[] }) {
  const byYear = React.useMemo(() => {
    const groups = new Map<number | null, ChecklistCard[]>();
    for (const c of cards) {
      const arr = groups.get(c.year) ?? [];
      arr.push(c);
      groups.set(c.year, arr);
    }
    return [...groups.entries()].sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0));
  }, [cards]);

  // Only one season is ever rendered at a time — with hundreds of cards per
  // season (each carrying its own image pair + a full parallel checklist),
  // rendering every season on one unpaginated page stops being practical
  // fast; a season switcher keeps the DOM size sane as more seasons are added.
  const [selectedYear, setSelectedYear] = React.useState<number | null | undefined>(undefined);
  const activeYear = selectedYear !== undefined ? selectedYear : byYear[0]?.[0];
  const activeCards = byYear.find(([year]) => year === activeYear)?.[1] ?? [];

  if (cards.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No checklist data seeded yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {byYear.map(([year, yearCards]) => (
          <button
            key={year ?? "unknown"}
            type="button"
            onClick={() => setSelectedYear(year)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              year === activeYear
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
            }`}
          >
            {seasonLabel(year)} Season
            <span className="ml-1.5 opacity-70">({yearCards.length})</span>
          </button>
        ))}
      </div>

      <section>
        <div className="flex flex-col gap-3">
          {activeCards.map((c) => (
            <ChecklistCardRow key={c.groupKey} card={c} />
          ))}
        </div>
      </section>
    </div>
  );
}
