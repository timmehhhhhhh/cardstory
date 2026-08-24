/**
 * Client-generated id shared by every PC-adjacent store (pc, shortlist,
 * account-scoped mutations) so an id is available synchronously — before
 * any network round trip — for call sites that need one back immediately
 * (e.g. pc-selector.tsx focusing a just-created PC). Real records still get
 * a server-assigned id on the remote store's next reconcile; this is only
 * ever the optimistic, client-side stand-in.
 */
export function id() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
