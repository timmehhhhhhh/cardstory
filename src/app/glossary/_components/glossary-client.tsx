"use client";

import * as React from "react";
import Link from "next/link";
import { BookA, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CARD_CONDITIONS, CARD_CONDITION_LABELS } from "@/lib/constants";
import { useConditionPricing } from "@/lib/condition-pricing/use-condition-pricing";
import {
  CARD_CONDITION_DESCRIPTIONS,
  GLOSSARY_CATEGORIES,
  GLOSSARY_ENTRIES,
  type GlossaryEntry,
} from "@/lib/glossary/entries";

function matches(entry: GlossaryEntry, query: string): boolean {
  const haystack = [entry.term, entry.abbr, ...(entry.aka ?? []), entry.definition]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

/**
 * Card Condition, the entry everything else here exists to support — linked
 * to directly from the Shortlist blurb and from Settings, so it sits above
 * the term list and is deliberately outside the search filter: a deep link
 * has to land on it whatever is typed in the box.
 */
function CardConditionOverview() {
  const pricing = useConditionPricing();

  return (
    <section
      id="card-condition"
      // The mobile TopNav is sticky and 56px tall; without the offset a
      // deep link lands with this heading tucked underneath it.
      className="scroll-mt-20 rounded-xl border border-border bg-surface p-4 sm:p-5"
    >
      <h2 className="text-lg font-semibold">Card Condition</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Raw (ungraded) cards are described on a five-step scale from Near Mint down to Damaged. Market
        prices are quoted for a Near Mint copy, so anything below that is worth a fraction of it.
      </p>

      <dl className="mt-4 flex flex-col gap-3">
        {CARD_CONDITIONS.map((c) => (
          <div
            key={c}
            className="flex flex-col gap-1.5 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-baseline sm:gap-4"
          >
            <dt className="flex flex-none items-center gap-2 sm:w-52">
              <Badge variant="outline" className="num-tabular font-semibold">
                {c}
              </Badge>
              <span className="text-sm font-medium">{CARD_CONDITION_LABELS[c]}</span>
            </dt>
            <dd className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-sm text-muted-foreground">{CARD_CONDITION_DESCRIPTIONS[c]}</span>
              <span className="num-tabular text-xs font-medium text-foreground/80">
                Worth {pricing[c]}% of market price
              </span>
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-sm text-muted-foreground">
        Set a condition on any card in your{" "}
        <Link href="/shortlist" className="underline underline-offset-2 hover:text-foreground">
          In-Store Shortlist
        </Link>{" "}
        to see what that copy is worth before you pay for it. These percentages are yours to change in{" "}
        <Link href="/settings" className="underline underline-offset-2 hover:text-foreground">
          Settings
        </Link>
        .
      </p>
    </section>
  );
}

export function GlossaryClient() {
  const [query, setQuery] = React.useState("");
  const normalised = query.trim().toLowerCase();

  const visible = React.useMemo(
    () => (normalised ? GLOSSARY_ENTRIES.filter((e) => matches(e, normalised)) : GLOSSARY_ENTRIES),
    [normalised]
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <BookA className="size-5 text-muted-foreground" aria-hidden />
          <h1 className="text-2xl font-bold">Glossary</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          The terms you&apos;ll run into around the hobby — on price lists, in shops, and in trading
          groups — in plain English.
        </p>
      </div>

      <CardConditionOverview />

      <div className="relative">
        <Search
          className="pointer-events-none absolute inset-y-0 left-3 my-auto size-4 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search terms…"
          aria-label="Search glossary terms"
          className="bg-surface pl-9"
        />
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          No terms match &ldquo;{query.trim()}&rdquo;. Card Condition is above, and everything else is a
          cleared search away.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {GLOSSARY_CATEGORIES.map((category) => {
            const entries = visible.filter((e) => e.category === category);
            if (entries.length === 0) return null;
            return (
              <section key={category} className="flex flex-col gap-2">
                <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {category}
                </h2>
                <dl className="flex flex-col gap-2">
                  {entries.map((entry) => (
                    <div
                      key={entry.slug}
                      id={entry.slug}
                      className="scroll-mt-20 rounded-xl border border-border bg-surface p-3.5"
                    >
                      <dt className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="text-sm font-semibold">{entry.term}</span>
                        {entry.abbr && (
                          <Badge variant="outline" className="font-medium">
                            {entry.abbr}
                          </Badge>
                        )}
                      </dt>
                      <dd className="mt-1 text-sm text-muted-foreground">{entry.definition}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
