"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { id } from "@/lib/deck-crafting/id";
import type { Deck, DeckCard, DeckCraftingState } from "@/lib/deck-crafting/types";

const QUERY_KEY = ["decks"] as const;

async function fetchDecks(): Promise<Deck[]> {
  const res = await fetch("/api/decks");
  if (!res.ok) throw new Error("Failed to load decks");
  const data = (await res.json()) as { decks: Deck[] };
  return data.decks;
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * Every optimistic mutation below reverts silently on failure (see
 * `reconcile`) — logging here at least makes a failed request visible in
 * the console instead of leaving zero trace, same as src/lib/pc/remote-store.ts.
 */
function logMutationFailure(action: string, res: Response | null, err?: unknown) {
  if (err) {
    console.error(`[deck-crafting] ${action} failed`, err);
    return;
  }
  if (res) {
    res
      .text()
      .catch(() => "<unreadable body>")
      .then((body) => console.error(`[deck-crafting] ${action} failed`, { status: res.status, body }));
  }
}

/**
 * Server-backed deck store for signed-in users — the only implementation
 * behind src/lib/deck-crafting/store.ts's pass-through, so consuming
 * components never called this directly. Mirrors
 * src/lib/pc/remote-store.ts's shape/optimistic-update/reconcile pattern
 * exactly.
 */
export function useRemoteDeckCraftingStore<T>(
  selector: (s: DeckCraftingState) => T,
  opts: { enabled: boolean }
): T {
  const queryClient = useQueryClient();

  const { data: decks = [] } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchDecks,
    enabled: opts.enabled,
    staleTime: 30_000,
  });

  const patch = React.useCallback(
    (updater: (decks: Deck[]) => Deck[]) => {
      queryClient.setQueryData<Deck[]>(QUERY_KEY, (old) => updater(old ?? []));
    },
    [queryClient]
  );

  const reconcile = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, [queryClient]);

  const patchDeck = React.useCallback(
    (deckId: string, fn: (d: Deck) => Deck) => {
      patch((ds) => ds.map((d) => (d.id === deckId ? { ...fn(d), updatedAt: nowIso() } : d)));
    },
    [patch]
  );

  const state: DeckCraftingState = React.useMemo(
    () => ({
      schemaVersion: 1,
      decks,

      createDeck: (name, gameId, formatId) => {
        const newId = id();
        const deck: Deck = {
          id: newId,
          name,
          gameId,
          formatId,
          status: "wip",
          sortOrder: decks.length,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          cards: [],
        };
        patch((ds) => [...ds, deck]);
        fetch("/api/decks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: newId, name, gameId, formatId }),
        })
          .then((res) => {
            if (!res.ok) {
              logMutationFailure("createDeck", res);
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("createDeck", null, err);
            reconcile();
          });
        return newId;
      },

      renameDeck: (deckId, name) => {
        patchDeck(deckId, (d) => ({ ...d, name }));
        fetch(`/api/decks/${deckId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        })
          .then((res) => {
            if (!res.ok) {
              logMutationFailure("renameDeck", res);
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("renameDeck", null, err);
            reconcile();
          });
      },

      setDeckStatus: (deckId, status) => {
        patchDeck(deckId, (d) => ({ ...d, status }));
        fetch(`/api/decks/${deckId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })
          .then((res) => {
            if (!res.ok) {
              logMutationFailure("setDeckStatus", res);
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("setDeckStatus", null, err);
            reconcile();
          });
      },

      setDeckNotes: (deckId, notes) => {
        patchDeck(deckId, (d) => ({ ...d, notes }));
        fetch(`/api/decks/${deckId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes }),
        })
          .then((res) => {
            if (!res.ok) {
              logMutationFailure("setDeckNotes", res);
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("setDeckNotes", null, err);
            reconcile();
          });
      },

      deleteDeck: (deckId) => {
        patch((ds) => ds.filter((d) => d.id !== deckId));
        fetch(`/api/decks/${deckId}`, { method: "DELETE" })
          .then((res) => {
            if (!res.ok) {
              logMutationFailure("deleteDeck", res);
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("deleteDeck", null, err);
            reconcile();
          });
      },

      reorderDecks: (orderedIds) => {
        patch((ds) => {
          const byId = new Map(ds.map((d) => [d.id, d]));
          const ordered = orderedIds.map((oid) => byId.get(oid)).filter((d): d is Deck => d != null);
          const remaining = ds.filter((d) => !orderedIds.includes(d.id));
          return [...ordered, ...remaining].map((d, i) => ({ ...d, sortOrder: i }));
        });
        fetch("/api/decks/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds }),
        })
          .then((res) => {
            if (!res.ok) {
              logMutationFailure("reorderDecks", res);
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("reorderDecks", null, err);
            reconcile();
          });
      },

      addCard: (deckId, section, catalogItemId, quantity = 1) => {
        patchDeck(deckId, (d) => {
          const existing = d.cards.find((c) => c.section === section && c.catalogItemId === catalogItemId);
          const cards = existing
            ? d.cards.map((c) => (c.id === existing.id ? { ...c, quantity: c.quantity + quantity } : c))
            : [...d.cards, { id: id(), section, catalogItemId, quantity } as DeckCard];
          return { ...d, cards };
        });
        fetch(`/api/decks/${deckId}/cards`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section, catalogItemId, quantity }),
        })
          .then((res) => {
            if (!res.ok) {
              logMutationFailure("addCard", res);
              reconcile();
            } else {
              // The optimistic card carries a client-generated id that
              // never reaches the server (manage.ts lets Prisma assign
              // its own) — reconcile so the cache holds the real id,
              // same "always resync after an id-creating mutation"
              // reasoning as copyHoldings/moveHoldings in pc/remote-store.ts.
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("addCard", null, err);
            reconcile();
          });
      },

      updateCardQuantity: (deckId, cardId, quantity) => {
        patchDeck(deckId, (d) => ({
          ...d,
          cards:
            quantity <= 0
              ? d.cards.filter((c) => c.id !== cardId)
              : d.cards.map((c) => (c.id === cardId ? { ...c, quantity } : c)),
        }));
        fetch(`/api/decks/${deckId}/cards/${cardId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity }),
        })
          .then((res) => {
            if (!res.ok) {
              logMutationFailure("updateCardQuantity", res);
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("updateCardQuantity", null, err);
            reconcile();
          });
      },

      moveCardSection: (deckId, cardId, section) => {
        patchDeck(deckId, (d) => ({
          ...d,
          cards: d.cards.map((c) => (c.id === cardId ? { ...c, section } : c)),
        }));
        fetch(`/api/decks/${deckId}/cards/${cardId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section }),
        })
          .then((res) => {
            if (!res.ok) {
              logMutationFailure("moveCardSection", res);
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("moveCardSection", null, err);
            reconcile();
          });
      },

      removeCard: (deckId, cardId) => {
        patchDeck(deckId, (d) => ({ ...d, cards: d.cards.filter((c) => c.id !== cardId) }));
        fetch(`/api/decks/${deckId}/cards/${cardId}`, { method: "DELETE" })
          .then((res) => {
            if (!res.ok) {
              logMutationFailure("removeCard", res);
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("removeCard", null, err);
            reconcile();
          });
      },
    }),
    [decks, patch, patchDeck, reconcile]
  );

  return selector(state);
}
