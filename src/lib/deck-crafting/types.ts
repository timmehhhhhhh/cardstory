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

/**
 * Every mutation the deck-crafting store exposes — same shape whether it's
 * ultimately backed by the server (src/lib/deck-crafting/remote-store.ts,
 * the only implementation left; see git history for the anonymous
 * localStorage version this replaced) so consuming components never know
 * which is live.
 */
export interface DeckCraftingActions {
  createDeck: (name: string, gameId: string, formatId: string) => string;
  renameDeck: (deckId: string, name: string) => void;
  setDeckStatus: (deckId: string, status: DeckStatus) => void;
  setDeckNotes: (deckId: string, notes: string) => void;
  deleteDeck: (deckId: string) => void;
  /** Reorders every deck to match `orderedIds` — ids not present are left at the end in their current relative order. */
  reorderDecks: (orderedIds: string[]) => void;

  addCard: (deckId: string, section: string, catalogItemId: string, quantity?: number) => void;
  updateCardQuantity: (deckId: string, cardId: string, quantity: number) => void;
  moveCardSection: (deckId: string, cardId: string, section: string) => void;
  removeCard: (deckId: string, cardId: string) => void;
}

export type DeckCraftingState = DeckCraftingStoreDataV1 & DeckCraftingActions;
