import { cn } from "@/lib/utils";
import { RIFTBOUND_RARITY_LABEL } from "@/lib/games/riftbound/rarity";
import { ChampionIcon, RarityIcon } from "@/components/cards/riftbound-icons";

const RARITY_COLOR: Record<string, string> = {
  common: "text-muted-foreground",
  uncommon: "text-positive",
  rare: "text-primary",
  mythic: "text-watchlist",
  "rare holo": "text-primary",
  "secret rare": "text-[#a9688a]",
  "ultra rare": "text-[#a9688a]",
  special: "text-[#a9688a]",
  // Riftbound (see lib/games/riftbound/rarity.ts) — common/uncommon/rare
  // already covered by the keys above.
  epic: "text-chart-4",
  showcase: "text-chart-5",
  promo: "text-chart-2",
};

// Exact-cased keys into RarityIcon/RIFTBOUND_RARITY_LABEL — Riftbound's
// rarity.ts values are always this casing, unlike the lowercased
// RARITY_COLOR lookup above (which also has to match other games' casing).
const RIFTBOUND_RARITIES = new Set(["Common", "Uncommon", "Rare", "Epic", "Showcase", "Promo"]);

/**
 * `cardType` is optional and only used to detect a Champion card (Riftbound's
 * cardTypeLabel() prefixes "Champion" onto the printed type, e.g. "Champion
 * Unit" — see lib/games/riftbound/card-types.ts) so its crest icon can show
 * alongside the real rarity icon — Champion is a separate supertype flag,
 * never a rarity tier of its own (see rarity.ts's doc comment).
 *
 * `gameId` gates which branch applies: RIFTBOUND_RARITIES contains the bare
 * string "Promo", which also happens to be the exact `rarity` value on every
 * WOTC Black Star Promo / hand-curated JP-KR promo Pokémon card — without
 * this gate, those cards were misidentified as Riftbound and got its promo
 * hexagon icon/color instead of the plain rarity label.
 */
export function RarityBadge({
  gameId,
  rarity,
  cardType,
  className,
}: {
  gameId: string;
  rarity: string | null;
  cardType?: string | null;
  className?: string;
}) {
  if (!rarity) return null;
  const isChampion = cardType?.startsWith("Champion") ?? false;
  if (gameId === "riftbound" && RIFTBOUND_RARITIES.has(rarity)) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs font-medium", className)}>
        <RarityIcon rarity={rarity} />
        {RIFTBOUND_RARITY_LABEL[rarity] ?? rarity}
        {isChampion && <ChampionIcon />}
      </span>
    );
  }
  const color = RARITY_COLOR[rarity.toLowerCase()] ?? "text-muted-foreground";
  return <span className={cn("text-xs font-medium", color, className)}>{rarity}</span>;
}
