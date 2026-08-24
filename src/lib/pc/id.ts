/**
 * Client-generated id for a PC or holding — used so mutations can return a
 * fresh id synchronously, before any network round trip completes (see
 * remote-store.ts's comment on why that matters). Split out of the old
 * local-store.ts so it survives that file's removal; shortlist and
 * deck-crafting's own local/remote stores share this same generator.
 */
export function id() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
