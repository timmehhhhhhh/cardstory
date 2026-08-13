import { cn } from "@/lib/utils";

const RARITY_COLOR: Record<string, string> = {
  common: "text-muted-foreground",
  uncommon: "text-[#8fd3c8]",
  rare: "text-primary",
  mythic: "text-[#fbbf24]",
  "rare holo": "text-primary",
  "secret rare": "text-[#818cf8]",
  "ultra rare": "text-[#818cf8]",
  special: "text-[#818cf8]",
};

export function RarityBadge({ rarity, className }: { rarity: string | null; className?: string }) {
  if (!rarity) return null;
  const color = RARITY_COLOR[rarity.toLowerCase()] ?? "text-muted-foreground";
  return <span className={cn("text-xs font-medium", color, className)}>{rarity}</span>;
}
