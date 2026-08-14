"use client";

import * as React from "react";
import Image from "next/image";
import { ExternalLink, ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { usePortfolioStore } from "@/lib/portfolio/store";
import type { ChecklistCard, ChecklistCardType } from "@/lib/sportscards/manage";
import type { ItemLanguage } from "@/lib/portfolio/types";

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

function CardImage({ url, label }: { url: string | null; label: "Front" | "Back" }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative aspect-[5/7] w-28 overflow-hidden rounded-md border border-border bg-surface-elevated sm:w-32">
        {url ? (
          <Image
            src={url}
            alt={`${label} of card`}
            fill
            unoptimized
            referrerPolicy="no-referrer"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground">
            <ImageOff className="size-5" />
            <span className="text-[10px]">No image</span>
          </div>
        )}
      </div>
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function ChecklistCardRow({ card }: { card: ChecklistCard }) {
  const activePortfolioId = usePortfolioStore((s) => s.activePortfolioId);
  const portfolios = usePortfolioStore((s) => s.portfolios);
  const addHolding = usePortfolioStore((s) => s.addHolding);
  const removeHoldings = usePortfolioStore((s) => s.removeHoldings);

  const activePortfolio = portfolios.find((p) => p.id === activePortfolioId);
  const holdings = activePortfolio?.holdings ?? [];

  function holdingIdsFor(sportsCardItemId: string) {
    return holdings.filter((h) => h.sportsCardItemId === sportsCardItemId).map((h) => h.id);
  }

  function toggleOwned(sportsCardItemId: string, owned: boolean) {
    if (owned) {
      removeHoldings(activePortfolioId, holdingIdsFor(sportsCardItemId));
    } else {
      addHolding(activePortfolioId, {
        kind: "sports",
        sportsCardItemId,
        quantity: 1,
        condition: "raw",
        language: "EN" as ItemLanguage,
        costBasisTotal: 0,
        costBasisCurrency: "USD",
        acquiredAt: new Date().toISOString(),
      });
    }
  }

  const setLabel = [card.year, card.distributor, card.setName].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:flex-row">
      <div className="flex shrink-0 gap-3">
        <CardImage url={card.imageUrl} label="Front" />
        <CardImage url={card.imageBackUrl} label="Back" />
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
                  onCheckedChange={() => toggleOwned(v.sportsCardItemId, owned)}
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
