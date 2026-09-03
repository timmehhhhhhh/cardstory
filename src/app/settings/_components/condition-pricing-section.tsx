"use client";

import * as React from "react";
import Link from "next/link";
import { Percent } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CARD_CONDITIONS,
  CARD_CONDITION_LABELS,
  DEFAULT_CONDITION_PRICING,
  type RawCardCondition,
} from "@/lib/constants";
import { isDefaultConditionPricing } from "@/lib/condition-pricing/resolve";
import {
  CONDITION_PRICING_QUERY_KEY,
  useConditionPricing,
} from "@/lib/condition-pricing/use-condition-pricing";
import type { ConditionPricing } from "@/lib/condition-pricing/types";

/**
 * The five condition -> percentage-of-market boxes behind the In-Store
 * Shortlist's "what is this copy actually worth" line.
 *
 * A sibling of settings-client.tsx's SettingRow rather than a use of it —
 * that component's `control` slot is a single right-aligned control, which
 * five labelled inputs plus a Reset button don't fit — but it reuses the
 * same container and header shape so it still reads as one more row in the
 * list.
 */
export function ConditionPricingSection() {
  const pricing = useConditionPricing();
  const queryClient = useQueryClient();

  // Draft strings, committed on blur/Enter rather than per keystroke —
  // same reasoning as the shortlist row's asking-price input: each commit
  // is a PATCH, and typing "85" over "100" shouldn't be three of them.
  const [drafts, setDrafts] = React.useState<Record<RawCardCondition, string>>(() =>
    toDrafts(pricing)
  );
  // Adopt server-side changes (another tab, a reset) rather than leaving a
  // stale draft on screen. Adjusted during render, not in an effect —
  // https://react.dev/learn/you-might-not-need-an-effect
  const [prevPricing, setPrevPricing] = React.useState(pricing);
  if (pricing !== prevPricing) {
    setPrevPricing(pricing);
    setDrafts(toDrafts(pricing));
  }

  async function save(next: ConditionPricing) {
    const previous = pricing;
    queryClient.setQueryData(CONDITION_PRICING_QUERY_KEY, next);
    try {
      const res = await fetch("/api/account/condition-pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error("Request failed");
    } catch {
      queryClient.setQueryData(CONDITION_PRICING_QUERY_KEY, previous);
      setDrafts(toDrafts(previous));
      toast.error("Couldn't save your condition percentages.");
    }
  }

  function commit(condition: RawCardCondition) {
    const parsed = Number(drafts[condition]);
    // Anything unparseable falls back to what's already saved rather than
    // to 0 — an empty box after a mis-tap shouldn't quietly value a whole
    // condition at nothing.
    const clean = Number.isFinite(parsed)
      ? Math.min(100, Math.max(0, Math.round(parsed)))
      : pricing[condition];
    setDrafts((d) => ({ ...d, [condition]: String(clean) }));
    if (clean !== pricing[condition]) void save({ ...pricing, [condition]: clean });
  }

  const isDefault = isDefaultConditionPricing(pricing);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="mt-0.5 text-muted-foreground">
            <Percent className="size-4" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Condition pricing</span>
            <p className="text-sm text-muted-foreground">
              What a card is worth in each condition, as a percentage of its market price. Used to value
              cards on your In-Store Shortlist.
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={isDefault}
          onClick={() => {
            setDrafts(toDrafts(DEFAULT_CONDITION_PRICING));
            void save(DEFAULT_CONDITION_PRICING);
          }}
        >
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {CARD_CONDITIONS.map((c) => (
          <div key={c} className="flex flex-col gap-1">
            <Label htmlFor={`condition-pricing-${c}`} className="flex flex-col items-start gap-0">
              <span className="text-sm font-medium">{c}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {CARD_CONDITION_LABELS[c]}
              </span>
            </Label>
            <div className="relative">
              <Input
                id={`condition-pricing-${c}`}
                type="number"
                min={0}
                max={100}
                step={1}
                inputMode="numeric"
                value={drafts[c]}
                onChange={(e) => setDrafts((d) => ({ ...d, [c]: e.target.value }))}
                onBlur={() => commit(c)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                className="num-tabular bg-background pr-7"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted-foreground"
              >
                %
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        Not sure what these mean?{" "}
        <Link
          href="/glossary#card-condition"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Read up on card condition in the Glossary
        </Link>
        .
      </p>
    </div>
  );
}

function toDrafts(pricing: ConditionPricing): Record<RawCardCondition, string> {
  return Object.fromEntries(CARD_CONDITIONS.map((c) => [c, String(pricing[c])])) as Record<
    RawCardCondition,
    string
  >;
}
