import { cn } from "@/lib/utils";

const RARITY_COLOR: Record<string, string> = {
  common: "text-muted-foreground",
  uncommon: "text-positive",
  rare: "text-primary",
  mythic: "text-watchlist",
  "rare holo": "text-primary",
  "secret rare": "text-[#a9688a]",
  "ultra rare": "text-[#a9688a]",
  special: "text-[#a9688a]",
};

export function RarityBadge({ rarity, className }: { rarity: string | null; className?: string }) {
  if (!rarity) return null;
  const color = RARITY_COLOR[rarity.toLowerCase()] ?? "text-muted-foreground";
  return <span className={cn("text-xs font-medium", color, className)}>{rarity}</span>;
}
