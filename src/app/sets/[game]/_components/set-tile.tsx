"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Layers } from "lucide-react";

/**
 * Cascades logo -> symbol -> generic icon, degrading gracefully on a 404 —
 * not just a missing URL. Some symbolUrls are reconstructed from a URL
 * convention rather than returned directly by the source API (see
 * tcgdexUnivSymbolUrl in lib/games/pokemon/mapper.ts), so they aren't
 * guaranteed to resolve — e.g. a just-announced set with no official art
 * uploaded yet. Client component so onError can swap the fallback in.
 */
function SetIcon({ logoUrl, symbolUrl }: { logoUrl: string | null; symbolUrl: string | null }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const [symbolFailed, setSymbolFailed] = useState(false);

  if (logoUrl && !logoFailed) {
    // Real set/product logo — wider than the symbol box below since these
    // are usually wordmark-shaped, not square icons. `fill` + object-contain
    // (rather than fixed width/height) keeps the real aspect ratio without
    // next/image's width/height-mismatch warning.
    return (
      <div className="relative h-10 w-16 flex-none">
        <Image
          src={logoUrl}
          alt=""
          fill
          unoptimized
          sizes="64px"
          className="object-contain"
          onError={() => setLogoFailed(true)}
        />
      </div>
    );
  }

  if (symbolUrl && !symbolFailed) {
    return (
      <div className="flex size-10 flex-none items-center justify-center rounded-lg bg-muted">
        <Image
          src={symbolUrl}
          alt=""
          width={22}
          height={22}
          unoptimized
          className="opacity-80"
          onError={() => setSymbolFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className="flex size-10 flex-none items-center justify-center rounded-lg bg-muted">
      <Layers className="size-5 text-muted-foreground" />
    </div>
  );
}

export function SetTile({
  gameId,
  setId,
  name,
  nameEn,
  code,
  cardCount,
  symbolUrl,
  logoUrl,
  releaseDate,
}: {
  gameId: string;
  setId: string;
  name: string;
  nameEn: string | null;
  code: string | null;
  cardCount: number;
  symbolUrl: string | null;
  logoUrl: string | null;
  releaseDate: string | null;
}) {
  return (
    <Link
      href={`/explore?game=${gameId}&set=${encodeURIComponent(setId)}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-surface-elevated"
    >
      <SetIcon logoUrl={logoUrl} symbolUrl={symbolUrl} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        {nameEn && <p className="truncate text-xs text-muted-foreground">{nameEn}</p>}
        <p className="truncate text-xs text-muted-foreground">
          {code ? `${code.toUpperCase()} · ` : ""}
          {cardCount} cards{releaseDate ? ` · ${releaseDate}` : ""}
        </p>
      </div>
    </Link>
  );
}
