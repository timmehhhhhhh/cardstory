"use client";

import * as React from "react";
import { ExternalLink, Loader2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePCStore } from "@/lib/pc/store";
import { formatMoney } from "@/lib/utils/format";
import { usePricingVisible } from "@/lib/utils/use-pricing-visible";
import type { EbaySoldCompsAggregate } from "@/lib/pricing/ebay/mapper";

type State =
  | { step: "idle" }
  | { step: "loading" }
  | { step: "unavailable" }
  | { step: "not-found" }
  | { step: "found"; values: EbaySoldCompsAggregate; cached: boolean };

interface EbaySoldCompsResponse {
  available: boolean;
  found?: boolean;
  values?: EbaySoldCompsAggregate;
  cached?: boolean;
}

const ROWS: { label: string; key: keyof Pick<EbaySoldCompsAggregate, "medianPrice" | "avgPrice" | "minPrice" | "maxPrice"> }[] = [
  { label: "Median", key: "medianPrice" },
  { label: "Average", key: "avgPrice" },
  { label: "Lowest", key: "minPrice" },
  { label: "Highest", key: "maxPrice" },
];

export function EbaySoldCompsPanel({ gameId, cardExternalId, cardName }: { gameId: string; cardExternalId: string; cardName: string }) {
  const [state, setState] = React.useState<State>({ step: "idle" });
  const currency = usePCStore((s) => s.preferences.currency);
  const pricingVisible = usePricingVisible();
  const liveSearchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(cardName)}&LH_Sold=1&LH_Complete=1`;

  // This whole panel is pricing data — when "Hide pricing & values" is on,
  // collapse it entirely rather than showing a "Load eBay sold comps"
  // button that leads nowhere useful, so it looks like it was never on the
  // page (same intent as Money's null-render — see components/ui/money.tsx).
  if (!pricingVisible) return null;

  async function load() {
    setState({ step: "loading" });
    try {
      const res = await fetch(`/api/ebay-sold-comps/${gameId}/${encodeURIComponent(cardExternalId)}`);
      const data = (await res.json()) as EbaySoldCompsResponse;
      if (!data.available) setState({ step: "unavailable" });
      else if (!data.found || !data.values) setState({ step: "not-found" });
      else setState({ step: "found", values: data.values, cached: Boolean(data.cached) });
    } catch {
      setState({ step: "not-found" });
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-1 flex items-center gap-1.5">
        <Tag className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">eBay Sold Comps</h2>
      </div>

      {state.step === "idle" && (
        <>
          <p className="mb-3 text-xs text-muted-foreground">
            Real prices from recent eBay sold &amp; completed listings — parsed from eBay&apos;s
            public search results, not an official eBay data feed. Fetched on demand and cached
            for the day.
          </p>
          <Button variant="outline" size="sm" onClick={load} className="w-full">
            Load eBay sold comps
          </Button>
        </>
      )}

      {state.step === "loading" && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Checking eBay sold listings…
        </p>
      )}

      {state.step === "unavailable" && (
        <p className="text-xs text-muted-foreground">
          Not enabled on this instance — set{" "}
          <code className="rounded bg-surface-elevated px-1 py-0.5">EBAY_SOLD_COMPS_ENABLED=true</code>{" "}
          to turn it on. It scrapes eBay&apos;s public search results rather than calling an
          official API, so it&apos;s off by default.
        </p>
      )}

      {state.step === "not-found" && (
        <p className="text-xs text-muted-foreground">
          Couldn&apos;t find confident sold comps for this card.{" "}
          <a
            href={liveSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-primary hover:underline"
          >
            Search eBay directly <ExternalLink className="size-3" />
          </a>
          .
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
            Based on {state.values.count} recent sold listing{state.values.count === 1 ? "" : "s"} ·{" "}
            {state.cached ? "cached today" : "fetched just now"} ·{" "}
            <a
              href={liveSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-primary hover:underline"
            >
              verify on eBay <ExternalLink className="size-3" />
            </a>
          </p>
        </>
      )}
    </div>
  );
}
