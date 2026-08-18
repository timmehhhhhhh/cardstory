"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardNumberBadge } from "@/components/cards/card-number-badge";
import { usePCStore } from "@/lib/pc/store";
import { formatMoney } from "@/lib/utils/format";
import { cardDetailHref } from "@/lib/catalog/card-href";
import type { ScanCandidate } from "@/lib/scan/match";
import type { ScanIdentification } from "@/lib/scan/gemini";

export function ScanResultConfirm({
  previewUrl,
  available,
  identification,
  candidates,
  onRetry,
}: {
  previewUrl: string;
  available: boolean;
  identification: ScanIdentification | null;
  candidates: ScanCandidate[];
  onRetry: () => void;
}) {
  const router = useRouter();
  const currency = usePCStore((s) => s.preferences.currency);

  const manualSearchHref = `/explore${identification?.cardName ? `?q=${encodeURIComponent(identification.cardName)}` : ""}`;

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-[160px_1fr]">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-border bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="Captured card" className="h-full w-full object-cover" />
      </div>

      <div>
        {!available && (
          <div className="mb-4 rounded-lg border border-border bg-surface p-3 text-sm text-muted-foreground">
            Automatic identification isn&apos;t available right now (no Gemini API key configured, or
            the request failed). Search for your card manually instead.
          </div>
        )}

        {available && candidates.length === 0 && (
          <div className="mb-4 rounded-lg border border-border bg-surface p-3 text-sm text-muted-foreground">
            {identification?.cardName
              ? `We read "${identification.cardName}" but couldn't confidently match it to a card in our catalog.`
              : "We couldn't clearly identify a card in that photo."}
          </div>
        )}

        {candidates.length > 0 && (
          <div className="mb-4 flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Is it one of these?
            </p>
            {candidates.map((c) => (
              <button
                key={c.catalogItemId}
                type="button"
                onClick={() => router.push(cardDetailHref(c.gameId, c.catalogItemId, false))}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-left hover:border-primary/40 hover:bg-surface-elevated"
              >
                <div className="relative h-14 w-10 flex-none overflow-hidden rounded bg-muted">
                  {c.imageSmallUrl && (
                    <Image src={c.imageSmallUrl} alt="" fill unoptimized className="object-contain" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="min-w-0 truncate text-sm font-medium">{c.name}</p>
                    <CardNumberBadge number={c.number} className="flex-none" />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{c.setName}</p>
                </div>
                <span className="num-tabular text-sm font-medium">{formatMoney(c.priceRaw, currency)}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onRetry}>
            <RotateCcw className="size-4" /> Try another photo
          </Button>
          <Button variant="outline" asChild>
            <Link href={manualSearchHref}>
              <Search className="size-4" /> Search manually
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
