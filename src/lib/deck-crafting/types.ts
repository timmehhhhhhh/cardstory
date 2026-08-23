/** One card line inside a deck. Shape matches the DeckCard Prisma model (src/lib/deck-crafting/manage.ts is the server-backed equivalent). */
export interface DeckCard {
  id: string;
  /** A section id from this deck's format — see src/lib/deck-crafting/formats. */
  section: string;
  /** CatalogItem.id ("<gameId>:<externalId>"), same id shape as Holding.catalogItemId. */
  catalogItemId: string;
  quantity: number;
}

export type DeckStatus = "wip" | "complete";

/** A saved deck. */
export interface Deck {
  id: string;
  name: string;
  /** src/lib/games/registry.ts game id, e.g. "riftbound" | "fab" | "pokemon". */
  gameId: string;
  /** src/lib/deck-crafting/formats id, e.g. "riftbound-constructed". */
  formatId: string;
  status: DeckStatus;
  /** User-controlled position in their deck list — see reorderDecks. */
  sortOrder: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  cards: DeckCard[];
}

/** Root shape persisted to localStorage under `cardstory:deck-crafting:v1`. */
export interface DeckCraftingStoreDataV1 {
  schemaVersion: 1;
  decks: Deck[];
}
