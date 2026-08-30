"use client";

import Link from "next/link";
import { usePCStore } from "@/lib/pc/store";
import { formatMoney } from "@/lib/utils/format";
import { cardDetailHref } from "@/lib/catalog/card-href";
import { languageLabel } from "@/lib/format/language";

export interface LanguageVariantEntry {
  id: string;
  gameId: string;
  name: string;
  nameEn: string | null;
  priceRaw: number | null;
  label: string;
}

/**
 * Every other language this card was printed in — one sub-heading per
 * language, English always first (even when the card being viewed isn't
 * English itself), then other languages alphabetically by display name.
 * See getFamilyMembers/the language-bucketing logic in the parent page for
 * how these groups are computed. Renders nothing when the card's family
 * has no other-language members (no cardFamilyId yet, or a family of one
 * language only).
 */
export function LanguageVariantsPanel({
  groups,
}: {
  groups: { language: string; members: LanguageVariantEntry[] }[];
}) {
  const currency = usePCStore((s) => s.preferences.currency);
  if (groups.length === 0) return null;

  return (
    <div className="mb-6">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Language variants</p>
      <div className="flex flex-col gap-2.5">
        {groups.map((g) => (
          <div key={g.language} className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">{languageLabel(g.language)}</span>
            {g.members.map((m) => (
              <Link
                key={m.id}
                href={cardDetailHref(m.gameId, m.id, false)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-surface-elevated"
              >
                {m.nameEn ?? m.name}
                {m.priceRaw != null && (
                  <span className="num-tabular text-muted-foreground">{formatMoney(m.priceRaw, currency)}</span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
