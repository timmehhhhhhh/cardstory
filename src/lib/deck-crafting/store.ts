"use client";

import { useSession } from "next-auth/react";
import { useDeckCraftingStore as useLocalDeckCraftingStore } from "@/lib/deck-crafting/local-store";
import { useRemoteDeckCraftingStore } from "@/lib/deck-crafting/remote-store";

export type { DeckCraftingState } from "@/lib/deck-crafting/local-store";
import type { DeckCraftingState } from "@/lib/deck-crafting/local-store";

/**
 * The single Deck Crafting store every component reads from — logged-out
 * visitors are served entirely from localStorage (useLocalDeckCraftingStore,
 * untouched); signed-in users are served from the server
 * (useRemoteDeckCraftingStore). Mirrors src/lib/pc/store.ts's switcher exactly.
 *
 * Both hooks are always called (React hook rules — no conditional hook
 * calls), and the unused one's query stays disabled via `enabled`.
 */
export function useDeckCraftingStore<T>(selector: (s: DeckCraftingState) => T): T {
  const { status } = useSession();
  const authed = status === "authenticated";

  const local = useLocalDeckCraftingStore(selector);
  const remote = useRemoteDeckCraftingStore(selector, { enabled: authed });

  return authed ? remote : local;
}
