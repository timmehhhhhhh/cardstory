import { ExternalLink } from "lucide-react";

/**
 * Deliberately does NOT show fabricated marketplace listings/prices — the
 * price above is a real snapshot from pokemontcg.io/Scryfall, but this app
 * has no live listings feed. These are real outbound search links to the
 * actual marketplaces, not invented data.
 */
export function ShopPanel({ cardName, gameId }: { cardName: string; gameId: string }) {
  const q = encodeURIComponent(cardName);
  const links =
    gameId === "mtg"
      ? [
          { label: "Search on TCGplayer", href: `https://www.tcgplayer.com/search/magic/product?q=${q}` },
          { label: "Search on Cardmarket", href: `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${q}` },
        ]
      : [
          { label: "Search on TCGplayer", href: `https://www.tcgplayer.com/search/pokemon/product?q=${q}` },
          { label: "Search on Cardmarket", href: `https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=${q}` },
        ];

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold">Shop</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        The price above is an estimated market value, not a live listing feed. Search real listings
        on these marketplaces:
      </p>
      <div className="flex flex-col gap-2">
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-elevated"
          >
            {l.label}
            <ExternalLink className="size-3.5 text-muted-foreground" />
          </a>
        ))}
      </div>
    </div>
  );
}
