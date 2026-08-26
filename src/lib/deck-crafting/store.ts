"use client";

import { useSession } from "next-auth/react";
import { useRemoteDeckCraftingStore } from "@/lib/deck-crafting/remote-store";
import type { DeckCraftingState } from "@/lib/deck-crafting/types";

export type { DeckCraftingState } from "@/lib/deck-crafting/types";

/**
 * The single Deck Crafting store every component reads from — same
 * pass-through shape as src/lib/pc/store.ts. Every route now requires a
 * signed-in session (see src/middleware.ts), so this is a direct pass-through
 * to useRemoteDeckCraftingStore; `enabled` stays a defensive no-op for the
 * brief moment a session is still resolving on first paint, rather than
 * firing requests that are guaranteed to 401.
 */
export function useDeckCraftingStore<T>(selector: (s: DeckCraftingState) => T): T {
  const { status } = useSession();
  return useRemoteDeckCraftingStore(selector, { enabled: status === "authenticated" });
}
