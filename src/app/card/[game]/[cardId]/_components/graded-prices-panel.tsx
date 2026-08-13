"use client";

import * as React from "react";
import { ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePortfolioStore } from "@/lib/portfolio/store";
import { formatMoney } from "@/lib/utils/format";
import type { GradedPriceValues } from "@/lib/pricing/pricecharting/mapper";

type State =
  | { step: "idle" }
  | { step: "loading" }
  | { step: "unavailable" }
  | { step: "not-found" }
  | { step: "found"; values: GradedPriceValues; cached: boolean };

const ROWS: { label: string; key: keyof GradedPriceValues }[] = [
  { label: "Ungraded (PriceCharting)", key: "loosePrice" },
  { label: "Grade 7 – 7.5", key: "grade7Price" },
  { label: "Grade 8 – 8.5", key: "grade8Price" },
  { label: "Grade 9", key: "grade9Price" },
  { label: "Grade 9.5", key: "grade95Price" },
  { label: "PSA 10", key: "psa10Price" },
  { label: "CGC 10", key: "cgc10Price" },
  { label: "SGC 10", key: "sgc10Price" },
  { label: "BGS 10", key: "bgs10Price" },
];

export function GradedPricesPanel({ gameId, cardExternalId }: { gameId: string; cardExternalId: string }) {
  const [state, setState] = React.useState<State>({ step: "idle" });
  const currency = usePortfolioStore((s) => s.preferences.currency);

  async function load() {
    setState({ step: "loading" });
    try {
      const res = await fetch(`/api/graded-prices/${gameId}/${encodeURIComponent(cardExternalId)}`);
      const data = await res.json();
      if (!data.available) setState({ step: "unavailable" });
      else if (!data.found) setState({ step: "not-found" });
      else setState({ step: "found", values: data.values, cached: data.cached });
    } catch {
      setState({ step: "not-found" });
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-1 flex items-center gap-1.5">
        <ShieldCheck className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Graded Prices</h2>
      </div>

      {state.step === "idle" && (
        <>
          <p className="mb-3 text-xs text-muted-foreground">
            Real PSA/CGC/SGC/BGS grade prices from PriceCharting&apos;s API — fetched on demand and
            cached for the day.
          </p>
          <Button variant="outline" size="sm" onClick={load} className="w-full">
            Load graded prices
          </Button>
        </>
      )}

      {state.step === "loading" && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Checking PriceCharting…
        </p>
      )}

      {state.step === "unavailable" && (
        <p className="text-xs text-muted-foreground">
          Not configured — this instance has no{" "}
          <code className="rounded bg-surface-elevated px-1 py-0.5">PRICECHARTING_API_KEY</code>. It&apos;s a
          paid API; see{" "}
          <a
            href="https://www.pricecharting.com/api-documentation"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-primary hover:underline"
          >
            their docs <ExternalLink className="size-3" />
          </a>
          .
        </p>
      )}

      {state.step === "not-found" && (
        <p className="text-xs text-muted-foreground">
          PriceCharting doesn&apos;t have a confident match for this card yet.
        </p>
      )}

      {state.step === "found" && (
        <>
          <div className="flex flex-col divide-y divide-border">
            {ROWS.map((r) => (
              <div key={r.key} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="num-tabular font-medium">{formatMoney(state.values[r.key], currency)}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Source: PriceCharting {state.cached ? "· cached today" : "· fetched just now"}
          </p>
        </>
      )}
    </div>
  );
}
