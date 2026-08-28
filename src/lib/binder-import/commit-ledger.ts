/**
 * A tiny, persisted record of "which binder-page pockets has this browser
 * already committed via Physical Binder Import" — the fix for the gap where
 * ImportSession (see types.ts's header) intentionally lives only in React
 * state and is lost on refresh. Without this, a reviewer who refreshes
 * mid-session (or well after a successful commit they don't realize
 * succeeded) and re-confirms the same physical page would regenerate fresh
 * random Holding ids in toPlacementHoldingInputs, creating genuine duplicate
 * Holdings — addHoldingsBatch upserts by id, so a new id is a new row, not a
 * no-op (see src/lib/pc/manage.ts).
 *
 * Deliberately NOT a full session-persistence layer (that's an explicit
 * non-goal per types.ts's header) — just an append-only ledger of what was
 * already placed, keyed by binderId + physicalPageNumber + pocketIndex, so
 * handleConfirmPage can warn before silently duplicating. Pure functions
 * over an injected key-value store (a Storage-shaped interface) so they're
 * unit-testable without touching real localStorage; import-client.tsx wires
 * them to window.localStorage.
 */

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "cardstory:binder-import-ledger:v1";

interface LedgerEntry {
  holdingId: string;
}

/** binderId -> physicalPageNumber -> pocketIndex -> entry. */
type LedgerData = Record<string, Record<string, Record<string, LedgerEntry>>>;

function readLedger(store: KeyValueStore): LedgerData {
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as LedgerData) : {};
  } catch {
    // Corrupt/foreign data at this key should never crash the import flow —
    // treat it as an empty ledger (worst case: a missed duplicate warning,
    // never a false block).
    return {};
  }
}

function writeLedger(store: KeyValueStore, data: LedgerData): void {
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full/unavailable (private browsing, quota) — the commit
    // itself already succeeded server-side; losing the local duplicate-
    // guard record is a degraded-but-safe failure mode, not a reason to
    // throw out of a commit that already landed.
  }
}

/** Records that `pocketIndex` on `physicalPageNumber` of `binderId` now holds `holdingId`. Call once per pocket right after a successful placeCard. */
export function recordCommittedPocket(
  store: KeyValueStore,
  binderId: string,
  physicalPageNumber: number,
  pocketIndex: number,
  holdingId: string
): void {
  const data = readLedger(store);
  const byBinder = (data[binderId] ??= {});
  const byPage = (byBinder[String(physicalPageNumber)] ??= {});
  byPage[String(pocketIndex)] = { holdingId };
  writeLedger(store, data);
}

/**
 * Of `pocketIndices`, returns the ones already recorded as committed for
 * this binderId + physicalPageNumber, with the holdingId they were recorded
 * against — the set handleConfirmPage warns about before letting a re-commit
 * proceed. Empty for a binder/page never committed before, or when the store
 * is empty/unavailable.
 */
export function findAlreadyCommitted(
  store: KeyValueStore,
  binderId: string,
  physicalPageNumber: number,
  pocketIndices: number[]
): { pocketIndex: number; holdingId: string }[] {
  const data = readLedger(store);
  const byPage = data[binderId]?.[String(physicalPageNumber)];
  if (!byPage) return [];
  return pocketIndices
    .filter((pocketIndex) => byPage[String(pocketIndex)] != null)
    .map((pocketIndex) => ({ pocketIndex, holdingId: byPage[String(pocketIndex)].holdingId }));
}
