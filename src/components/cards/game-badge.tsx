import { getGameMeta } from "@/lib/games/registry";
import { cn } from "@/lib/utils";

export function GameBadge({ gameId, className }: { gameId: string; className?: string }) {
  const meta = getGameMeta(gameId);
  if (!meta) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-muted-foreground bg-surface-elevated border border-border",
        className
      )}
    >
      {meta.shortLabel}
    </span>
  );
}
