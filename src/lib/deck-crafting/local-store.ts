"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Deck, DeckCard, DeckCraftingStoreDataV1, DeckStatus } from "@/lib/deck-crafting/types";

const STORAGE_KEY = "cardstory:deck-crafting:v1";

export function id() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function defaultState(): DeckCraftingStoreDataV1 {
  return { schemaVersion: 1, decks: [] };
}

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

function updateDeck(
  set: (fn: (s: DeckCraftingState) => Partial<DeckCraftingState>) => void,
  deckId: string,
  fn: (d: Deck) => Deck
) {
  set((s) => ({
    decks: s.decks.map((d) => (d.id === deckId ? { ...fn(d), updatedAt: nowIso() } : d)),
  }));
}

export const useDeckCraftingStore = create<DeckCraftingState>()(
  persist(
    (set) => ({
      ...defaultState(),

      createDeck: (name, gameId, formatId) => {
        const deckId = id();
        set((s) => ({
          decks: [
            ...s.decks,
            {
              id: deckId,
              name,
              gameId,
              formatId,
              status: "wip",
              sortOrder: s.decks.length,
              createdAt: nowIso(),
              updatedAt: nowIso(),
              cards: [],
            },
          ],
        }));
        return deckId;
      },

      renameDeck: (deckId, name) => updateDeck(set, deckId, (d) => ({ ...d, name })),
      setDeckStatus: (deckId, status) => updateDeck(set, deckId, (d) => ({ ...d, status })),
      setDeckNotes: (deckId, notes) => updateDeck(set, deckId, (d) => ({ ...d, notes })),

      deleteDeck: (deckId) => set((s) => ({ decks: s.decks.filter((d) => d.id !== deckId) })),

      reorderDecks: (orderedIds) =>
        set((s) => {
          const byId = new Map(s.decks.map((d) => [d.id, d]));
          const ordered = orderedIds.map((id) => byId.get(id)).filter((d): d is Deck => d != null);
          const remaining = s.decks.filter((d) => !orderedIds.includes(d.id));
          const combined = [...ordered, ...remaining];
          return { decks: combined.map((d, i) => ({ ...d, sortOrder: i })) };
        }),

      addCard: (deckId, section, catalogItemId, quantity = 1) =>
        updateDeck(set, deckId, (d) => {
          const existing = d.cards.find((c) => c.section === section && c.catalogItemId === catalogItemId);
          if (existing) {
            return {
              ...d,
              cards: d.cards.map((c) =>
                c.id === existing.id ? { ...c, quantity: c.quantity + quantity } : c
              ),
            };
          }
          const card: DeckCard = { id: id(), section, catalogItemId, quantity };
          return { ...d, cards: [...d.cards, card] };
        }),

      updateCardQuantity: (deckId, cardId, quantity) =>
        updateDeck(set, deckId, (d) => ({
          ...d,
          cards:
            quantity <= 0
              ? d.cards.filter((c) => c.id !== cardId)
              : d.cards.map((c) => (c.id === cardId ? { ...c, quantity } : c)),
        })),

      moveCardSection: (deckId, cardId, section) =>
        updateDeck(set, deckId, (d) => ({
          ...d,
          cards: d.cards.map((c) => (c.id === cardId ? { ...c, section } : c)),
        })),

      removeCard: (deckId, cardId) =>
        updateDeck(set, deckId, (d) => ({ ...d, cards: d.cards.filter((c) => c.id !== cardId) })),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== "object") return defaultState();
        return persisted as DeckCraftingState;
      },
    }
  )
);
