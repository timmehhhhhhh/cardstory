import Link from "next/link";
import { Clock } from "lucide-react";
import { GAMES } from "@/lib/games/registry";

export function GameLogoGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {GAMES.map((g) => {
        const wired = g.status === "WIRED";
        const tile = (
          <div
            className={
              "group relative flex aspect-[3/2] flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-colors " +
              (wired
                ? "border-border bg-surface hover:border-primary/40 hover:bg-surface-elevated"
                : "border-border/60 bg-surface/50")
            }
          >
            {!wired && (
              <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                <Clock className="size-3" /> Coming soon
              </span>
            )}
            <span
              className={
                "text-lg font-extrabold tracking-wide " + (wired ? "text-foreground" : "text-muted-foreground")
              }
            >
              {g.shortLabel}
            </span>
            <span className={"px-2 text-xs " + (wired ? "text-muted-foreground" : "text-muted-foreground/70")}>
              {g.name}
            </span>
          </div>
        );

        return wired ? (
          <Link key={g.id} href={`/sets/${g.id}`}>
            {tile}
          </Link>
        ) : (
          <div key={g.id} aria-disabled className="cursor-default">
            {tile}
          </div>
        );
      })}
    </div>
  );
}
