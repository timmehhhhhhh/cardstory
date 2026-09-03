"use client";

import * as React from "react";
import { Gamepad2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { GAMES } from "@/lib/games/registry";

const WIRED_GAMES = GAMES.filter((g) => g.status === "WIRED");

/**
 * Which card games/TCGs should show up while browsing/searching/adding
 * cards — most people collect one or two games and don't want the rest
 * cluttering Explore, /sets, or the binder card picker. A sibling of
 * ConditionPricingSection/LanguageVisibilitySection rather than a use of
 * SettingRow, same reasoning as that component.
 *
 * Stores what's *hidden*, not what's visible (hiddenGameIds on the User
 * model), so a newly wired-up game defaults to visible for every existing
 * account without needing a migration to backfill it into a "visible" list.
 */
export function GameVisibilitySection() {
  const { data: session, update } = useSession();
  const [pending, setPending] = React.useState(false);
  const hidden = session?.user?.hiddenGameIds ?? [];

  async function commit(nextHidden: string[]) {
    setPending(true);
    try {
      const res = await fetch("/api/account/game-visibility", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hiddenGameIds: nextHidden }),
      });
      if (res.ok) {
        await update({ hiddenGameIds: nextHidden });
      } else {
        toast.error("Couldn't update your game filter.");
      }
    } catch {
      toast.error("Couldn't update your game filter.");
    } finally {
      setPending(false);
    }
  }

  function toggle(gameId: string, checked: boolean) {
    const current = hidden.filter((id) => WIRED_GAMES.some((g) => g.id === id));
    const next = checked ? current.filter((id) => id !== gameId) : [...current, gameId];
    // Refuse to hide every game — that would leave nothing to browse at all.
    if (next.length === WIRED_GAMES.length) return;
    commit(next);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex gap-3">
        <div className="mt-0.5 text-muted-foreground">
          <Gamepad2 className="size-4" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Card games</span>
          <p className="text-sm text-muted-foreground">
            Only show these games while browsing, searching, and adding cards. Cards you already own stay in your
            collection regardless.
          </p>
        </div>
      </div>
      <div className="ml-7 flex flex-wrap gap-x-5 gap-y-2">
        {WIRED_GAMES.map((game) => (
          <div key={game.id} className="flex items-center gap-2">
            <Checkbox
              id={`game-${game.id}`}
              checked={!hidden.includes(game.id)}
              disabled={pending}
              onCheckedChange={(checked) => toggle(game.id, checked === true)}
            />
            <Label htmlFor={`game-${game.id}`} className="text-sm font-normal">
              {game.name}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
