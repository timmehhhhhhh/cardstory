import type * as React from "react";
import { RIFTBOUND_DOMAIN_COLOR } from "@/lib/games/riftbound/domain";
import { cn } from "@/lib/utils";

/**
 * Small original glyphs for Riftbound's rarity tiers and domains —
 * deliberately simplified shapes (circle/triangle/diamond/hexagon/ribbon,
 * plain colored dots for domains), not a reproduction of Riot's printed
 * card symbols, so this doesn't lean on reusing their trademarked artwork.
 * Sized via `className` (default 14px) — pass `size-3`/`size-4`/etc.
 */

const RARITY_SHAPE: Record<string, (color: string) => React.ReactNode> = {
  Common: (color) => <circle cx="7" cy="7" r="4.5" fill={color} />,
  Uncommon: (color) => <path d="M7 1.5 12.5 11H1.5Z" fill={color} />,
  Rare: (color) => <path d="M7 1 12.5 7 7 13 1.5 7Z" fill={color} />,
  Epic: (color) => (
    <path d="M7 1 12.2 4v6L7 13 1.8 10V4Z" fill={color} />
  ),
  // "Showcase" — displayed as "Alternate Art" (see RIFTBOUND_RARITY_LABEL) —
  // gets the same hexagon as Epic, split diagonally two-tone to read as a
  // distinct "special printing" variant of it at a glance.
  Showcase: (color) => (
    <>
      <path d="M7 1 12.2 4v6L7 13 1.8 10V4Z" fill={color} fillOpacity={0.35} />
      <path d="M7 1 12.2 4v6L7 13Z" fill={color} />
    </>
  ),
  Promo: (color) => (
    <path
      d="M7 1.5 8.7 4.6 12.2 5 9.7 7.5 10.3 11 7 9.3 3.7 11 4.3 7.5 1.8 5 5.3 4.6Z"
      fill={color}
    />
  ),
};

const RARITY_COLOR: Record<string, string> = {
  Common: "#9ca3af",
  Uncommon: "#3aa76d",
  Rare: "#7c3aed",
  Epic: "#e08a2b",
  Showcase: "#d4af37",
  Promo: "#a855f7",
};

export function RarityIcon({ rarity, className }: { rarity: string; className?: string }) {
  const shape = RARITY_SHAPE[rarity];
  if (!shape) return null;
  const color = RARITY_COLOR[rarity] ?? "currentColor";
  return (
    <svg viewBox="0 0 14 14" className={cn("size-3.5 flex-none", className)} aria-hidden>
      {shape(color)}
    </svg>
  );
}

/** Overlay icon for Champion cards (classification.supertype = "Champion") — shown alongside, never instead of, the real rarity icon. */
export function ChampionIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" className={cn("size-3.5 flex-none", className)} aria-hidden>
      <circle cx="7" cy="7" r="6" fill="none" stroke="#d4af37" strokeWidth="1.4" />
      <path d="M7 3.5 8.2 6.2 11 6.6 9 8.6 9.5 11.4 7 10 4.5 11.4 5 8.6 3 6.6 5.8 6.2Z" fill="#d4af37" />
    </svg>
  );
}

export function DomainIcon({ domain, className }: { domain: string; className?: string }) {
  const color = RIFTBOUND_DOMAIN_COLOR[domain] ?? "#9ca3af";
  return (
    <svg
      viewBox="0 0 14 14"
      className={cn("size-3.5 flex-none", className)}
      role="img"
      aria-label={domain}
    >
      <circle cx="7" cy="7" r="6" fill={color} fillOpacity={0.18} stroke={color} strokeWidth="1.2" />
      <circle cx="7" cy="7" r="2.6" fill={color} />
    </svg>
  );
}
