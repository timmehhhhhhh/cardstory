import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";
import type { Deck, DeckCard, DeckStatus } from "@/lib/deck-crafting/types";

/**
 * Server-backed Deck Crafting storage for signed-in users — the accounts
 * equivalent of src/lib/deck-crafting/local-store.ts. Every function here
 * takes the requesting userId and re-checks row ownership itself (never
 * trusting that a valid session alone means the caller owns the deck/card
 * id in question — those ids are client-supplied), same convention as
 * src/lib/pc/manage.ts's assertOwnsPC/assertOwnsHolding.
 *
 * Every user-intentional mutation here also writes a best-effort entry to
 * the account menu's History feed (src/lib/activity/log.ts), same as every
 * /api/pc/** route funnels through src/lib/pc/manage.ts.
 */

function toDeckCard(row: { id: string; section: string; catalogItemId: string; quantity: number }): DeckCard {
  return { id: row.id, section: row.section, catalogItemId: row.catalogItemId, quantity: row.quantity };
}

function toDeck(row: {
  id: string;
  name: string;
  gameId: string;
  formatId: string;
  status: string;
  sortOrder: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  cards: { id: string; section: string; catalogItemId: string; quantity: number }[];
}): Deck {
  return {
    id: row.id,
    name: row.name,
    gameId: row.gameId,
    formatId: row.formatId,
    status: row.status as DeckStatus,
    sortOrder: row.sortOrder,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    cards: row.cards.map(toDeckCard),
  };
}

/** All of a user's decks, each with its cards, in their user-chosen order. */
export async function listDecks(userId: string): Promise<Deck[]> {
  const rows = await db.deck.findMany({
    where: { userId },
    include: { cards: true },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(toDeck);
}

export async function createDeck(
  userId: string,
  id: string,
  name: string,
  gameId: string,
  formatId: string
): Promise<void> {
  const maxSort = await db.deck.aggregate({ where: { userId }, _max: { sortOrder: true } });
  const sortOrder = (maxSort._max.sortOrder ?? -1) + 1;
  await db.deck.create({ data: { id, userId, name, gameId, formatId, sortOrder } });
  await logActivity(userId, {
    action: "deck.created",
    entityType: "deck",
    entityId: id,
    summary: `Created deck "${name}"`,
    metadata: { gameId, formatId },
  });
}

async function assertOwnsDeck(userId: string, deckId: string): Promise<{ id: string; name: string }> {
  const deck = await db.deck.findUnique({ where: { id: deckId }, select: { id: true, userId: true, name: true } });
  if (!deck || deck.userId !== userId) {
    throw new Error("Deck not found");
  }
  return { id: deck.id, name: deck.name };
}

export async function renameDeck(userId: string, deckId: string, name: string): Promise<void> {
  const deck = await assertOwnsDeck(userId, deckId);
  await db.deck.update({ where: { id: deckId }, data: { name } });
  if (name !== deck.name) {
    await logActivity(userId, {
      action: "deck.renamed",
      entityType: "deck",
      entityId: deckId,
      summary: `Renamed deck "${deck.name}" to "${name}"`,
    });
  }
}

export async function setDeckStatus(userId: string, deckId: string, status: DeckStatus): Promise<void> {
  const deck = await assertOwnsDeck(userId, deckId);
  await db.deck.update({ where: { id: deckId }, data: { status } });
  await logActivity(userId, {
    action: "deck.status_changed",
    entityType: "deck",
    entityId: deckId,
    summary: `Marked "${deck.name}" as ${status === "complete" ? "Complete" : "Work in Progress"}`,
  });
}

export async function setDeckNotes(userId: string, deckId: string, notes: string): Promise<void> {
  await assertOwnsDeck(userId, deckId);
  await db.deck.update({ where: { id: deckId }, data: { notes } });
}

export async function deleteDeck(userId: string, deckId: string): Promise<void> {
  const deck = await assertOwnsDeck(userId, deckId);
  await db.deck.delete({ where: { id: deckId } });
  await logActivity(userId, {
    action: "deck.deleted",
    entityType: "deck",
    entityId: deckId,
    summary: `Deleted deck "${deck.name}"`,
  });
}

/** Reassigns sortOrder for every deck in `orderedIds` to match that order — not logged, a pure reordering action generates no meaningful History line (mirrors why binder page moves aren't logged either). */
export async function reorderDecks(userId: string, orderedIds: string[]): Promise<void> {
  const owned = await db.deck.findMany({ where: { userId, id: { in: orderedIds } }, select: { id: true } });
  const ownedIds = new Set(owned.map((d) => d.id));
  await db.$transaction(
    orderedIds
      .filter((id) => ownedIds.has(id))
      .map((id, index) => db.deck.update({ where: { id }, data: { sortOrder: index } }))
  );
}

async function resolveCardName(catalogItemId: string): Promise<string> {
  const item = await db.catalogItem.findUnique({ where: { id: catalogItemId }, select: { name: true } });
  return item?.name ?? "a card";
}

export async function addCard(
  userId: string,
  deckId: string,
  section: string,
  catalogItemId: string,
  quantity: number
): Promise<void> {
  const deck = await assertOwnsDeck(userId, deckId);
  const existing = await db.deckCard.findFirst({ where: { deckId, section, catalogItemId } });
  if (existing) {
    await db.deckCard.update({ where: { id: existing.id }, data: { quantity: existing.quantity + quantity } });
  } else {
    await db.deckCard.create({ data: { deckId, section, catalogItemId, quantity } });
  }
  const name = await resolveCardName(catalogItemId);
  await logActivity(userId, {
    action: "deck.card_added",
    entityType: "deck",
    entityId: deckId,
    summary: `Added ${quantity > 1 ? `${quantity}x ` : ""}${name} to "${deck.name}"`,
    metadata: { section, catalogItemId, quantity },
  });
}

async function assertOwnsCard(userId: string, cardId: string) {
  const card = await db.deckCard.findUnique({
    where: { id: cardId },
    select: { id: true, deckId: true, catalogItemId: true, deck: { select: { userId: true, name: true } } },
  });
  if (!card || card.deck.userId !== userId) {
    throw new Error("Card not found");
  }
  return card;
}

export async function updateCardQuantity(userId: string, cardId: string, quantity: number): Promise<void> {
  await assertOwnsCard(userId, cardId);
  if (quantity <= 0) {
    await db.deckCard.delete({ where: { id: cardId } });
  } else {
    await db.deckCard.update({ where: { id: cardId }, data: { quantity } });
  }
}

export async function moveCardSection(userId: string, cardId: string, section: string): Promise<void> {
  await assertOwnsCard(userId, cardId);
  await db.deckCard.update({ where: { id: cardId }, data: { section } });
}

export async function removeCard(userId: string, cardId: string): Promise<void> {
  const card = await assertOwnsCard(userId, cardId);
  await db.deckCard.delete({ where: { id: cardId } });
  const name = await resolveCardName(card.catalogItemId);
  await logActivity(userId, {
    action: "deck.card_removed",
    entityType: "deck",
    entityId: card.deckId,
    summary: `Removed ${name} from "${card.deck.name}"`,
  });
}
