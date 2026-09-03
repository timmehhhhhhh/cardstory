"use client";

import Link from "next/link";
import { usePCStore } from "@/lib/pc/store";
import { Money } from "@/components/ui/money";
import { formatReleaseDate } from "@/lib/format/date";
import { cardDetailHref } from "@/lib/catalog/card-href";
import { Badge } from "@/components/ui/badge";

export interface ReprintEntry {
  id: string;
  gameId: string;
  name: string;
  nameEn: string | null;
  priceRaw: number | null;
  releaseDate: Date | null;
}

/**
 * Every other printing of this card in the SAME language as the one being
 * viewed — i.e. reprints across sets/years — oldest to newest. The oldest
 * entry is badged "Original" (best-effort: it's just whichever family
 * member has the earliest known set release date, not a verified
 * first-print record), every later one "Reprint". Renders nothing when the
 * card's family has no same-language reprints (no cardFamilyId yet, or a
 * family with only one printing in this language).
 */
export function ReprintsPanel({ entries }: { entries: ReprintEntry[] }) {
  const currency = usePCStore((s) => s.preferences.currency);
  if (entries.length === 0) return null;

  return (
    <div className="mb-6">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Reprints / Original appearance
      </p>
      <div className="flex flex-wrap gap-2">
        {entries.map((e, i) => {
          const releaseLabel = formatReleaseDate(e.releaseDate);
          return (
            <Link
              key={e.id}
              href={cardDetailHref(e.gameId, e.id, false)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-surface-elevated"
            >
              <Badge variant={i === 0 ? "secondary" : "outline"} className="font-normal">
                {i === 0 ? "Original" : "Reprint"}
              </Badge>
              {e.nameEn ?? e.name}
              {releaseLabel && <span className="text-muted-foreground">{releaseLabel}</span>}
              {e.priceRaw != null && (
                <Money amountUsd={e.priceRaw} currency={currency} className="num-tabular text-muted-foreground" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
