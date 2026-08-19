import Link from "next/link";
import Image from "next/image";
import { Layers } from "lucide-react";

export function SetTile({
  gameId,
  setId,
  name,
  code,
  cardCount,
  symbolUrl,
  logoUrl,
  releaseDate,
}: {
  gameId: string;
  setId: string;
  name: string;
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
      {logoUrl ? (
        // Real set/product logo — wider than the symbol box below since
        // these are usually wordmark-shaped, not square icons.
        <div className="flex h-10 w-16 flex-none items-center justify-center">
          <Image
            src={logoUrl}
            alt=""
            width={64}
            height={40}
            unoptimized
            className="max-h-10 w-auto max-w-16 object-contain"
          />
        </div>
      ) : (
        <div className="flex size-10 flex-none items-center justify-center rounded-lg bg-muted">
          {symbolUrl ? (
            <Image src={symbolUrl} alt="" width={22} height={22} unoptimized className="opacity-80" />
          ) : (
            <Layers className="size-5 text-muted-foreground" />
          )}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {code ? `${code.toUpperCase()} · ` : ""}
          {cardCount} cards{releaseDate ? ` · ${releaseDate}` : ""}
        </p>
      </div>
    </Link>
  );
}
