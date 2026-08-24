/**
 * Client-generated id for deck-crafting mutations, so an id is available
 * synchronously — before any network round trip — the same convention as
 * src/lib/pc/id.ts. Real decks/cards still get a server-assigned id on the
 * remote store's next reconcile; this is only ever the optimistic,
 * client-side stand-in.
 */
export function id() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
