import { describe, expect, it } from "vitest";
import { findAlreadyCommitted, recordCommittedPocket, type KeyValueStore } from "./commit-ledger";

/** In-memory stand-in for localStorage, so these tests never touch real browser storage. */
function makeFakeStore(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

describe("commit-ledger (refresh-safe duplicate-commit guard)", () => {
  it("reports nothing already committed for a binder/page never recorded before", () => {
    const store = makeFakeStore();
    expect(findAlreadyCommitted(store, "binder-1", 1, [0, 1, 2])).toEqual([]);
  });

  it("finds a pocket after it's recorded, carrying its holdingId", () => {
    const store = makeFakeStore();
    recordCommittedPocket(store, "binder-1", 1, 3, "holding-abc");
    expect(findAlreadyCommitted(store, "binder-1", 1, [0, 3, 5])).toEqual([{ pocketIndex: 3, holdingId: "holding-abc" }]);
  });

  it("scopes lookups to the exact binderId + physicalPageNumber — the core refresh-duplication guard", () => {
    const store = makeFakeStore();
    recordCommittedPocket(store, "binder-1", 1, 0, "holding-a");
    // Same pocketIndex, different physical page — must not match.
    expect(findAlreadyCommitted(store, "binder-1", 2, [0])).toEqual([]);
    // Same pocketIndex + page, different binder — must not match.
    expect(findAlreadyCommitted(store, "binder-2", 1, [0])).toEqual([]);
  });

  it("survives being read back through a brand-new store instance pointed at the same backing data — simulates a page refresh", () => {
    const data = new Map<string, string>();
    const storeA: KeyValueStore = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
    const storeB: KeyValueStore = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };

    recordCommittedPocket(storeA, "binder-1", 4, 2, "holding-xyz");
    // A fresh "session" (storeB, same underlying localStorage) still sees it —
    // this is exactly what prevents a post-refresh recommit from silently
    // generating a duplicate Holding for the same physical pocket.
    expect(findAlreadyCommitted(storeB, "binder-1", 4, [2])).toEqual([{ pocketIndex: 2, holdingId: "holding-xyz" }]);
  });

  it("records multiple pockets across multiple pages without clobbering each other", () => {
    const store = makeFakeStore();
    recordCommittedPocket(store, "binder-1", 1, 0, "holding-1a");
    recordCommittedPocket(store, "binder-1", 1, 1, "holding-1b");
    recordCommittedPocket(store, "binder-1", 2, 0, "holding-2a");

    expect(findAlreadyCommitted(store, "binder-1", 1, [0, 1, 2])).toEqual([
      { pocketIndex: 0, holdingId: "holding-1a" },
      { pocketIndex: 1, holdingId: "holding-1b" },
    ]);
    expect(findAlreadyCommitted(store, "binder-1", 2, [0])).toEqual([{ pocketIndex: 0, holdingId: "holding-2a" }]);
  });

  it("never throws on corrupt/foreign data at the storage key — treats it as an empty ledger", () => {
    const store = makeFakeStore();
    store.setItem("cardstory:binder-import-ledger:v1", "not json{{{");
    expect(() => findAlreadyCommitted(store, "binder-1", 1, [0])).not.toThrow();
    expect(findAlreadyCommitted(store, "binder-1", 1, [0])).toEqual([]);
    expect(() => recordCommittedPocket(store, "binder-1", 1, 0, "holding-1")).not.toThrow();
  });

  it("degrades safely when the store throws on write (e.g. quota exceeded) — never blocks the caller", () => {
    const throwingStore: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(() => recordCommittedPocket(throwingStore, "binder-1", 1, 0, "holding-1")).not.toThrow();
  });
});
