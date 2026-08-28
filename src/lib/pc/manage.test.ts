import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NewHoldingInput } from "@/lib/pc/types";

const { portfolioFindUnique, holdingUpsert, activityLogCreate } = vi.hoisted(() => ({
  portfolioFindUnique: vi.fn(),
  holdingUpsert: vi.fn(),
  activityLogCreate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    portfolio: { findUnique: portfolioFindUnique },
    holding: { upsert: holdingUpsert },
    activityLog: { create: activityLogCreate },
  },
}));

const { addHoldingsBatch } = await import("@/lib/pc/manage");

const USER_ID = "user-1";
const PC_ID = "pc-1";

function makeItem(id: string): NewHoldingInput & { id: string } {
  return {
    id,
    kind: "tcg",
    catalogItemId: "pokemon:base1-4",
    quantity: 1,
    condition: "raw",
    language: "EN",
    costBasisTotal: 0,
    costBasisCurrency: "USD",
    acquiredAt: null,
  };
}

beforeEach(() => {
  portfolioFindUnique.mockReset();
  holdingUpsert.mockReset();
  activityLogCreate.mockReset();
  portfolioFindUnique.mockResolvedValue({ id: PC_ID, userId: USER_ID, name: "Main", kind: "personal" });
  activityLogCreate.mockResolvedValue({});
});

describe("addHoldingsBatch", () => {
  it("upserts every item and reports each as created", async () => {
    holdingUpsert.mockResolvedValue({});
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];

    const results = await addHoldingsBatch(USER_ID, PC_ID, items);

    expect(holdingUpsert).toHaveBeenCalledTimes(3);
    expect(results).toEqual([
      { id: "a", status: "created" },
      { id: "b", status: "created" },
      { id: "c", status: "created" },
    ]);
  });

  it("isolates one item's failure — the rest still commit and are reported individually", async () => {
    holdingUpsert.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === "b") throw new Error("db exploded");
      return {};
    });
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];

    const results = await addHoldingsBatch(USER_ID, PC_ID, items);

    expect(results).toEqual([
      { id: "a", status: "created" },
      { id: "b", status: "failed", error: "db exploded" },
      { id: "c", status: "created" },
    ]);
  });

  it("is idempotent: resending the same item ids upserts (never re-creates) each row", async () => {
    holdingUpsert.mockResolvedValue({});
    const items = [makeItem("a"), makeItem("b")];

    await addHoldingsBatch(USER_ID, PC_ID, items);
    await addHoldingsBatch(USER_ID, PC_ID, items);

    expect(holdingUpsert).toHaveBeenCalledTimes(4);
    for (const call of holdingUpsert.mock.calls) {
      expect(call[0]).toMatchObject({ update: {} });
    }
  });

  it("re-checks PC ownership and refuses a PC the user doesn't own", async () => {
    portfolioFindUnique.mockResolvedValue({ id: PC_ID, userId: "someone-else", name: "Main", kind: "personal" });

    await expect(addHoldingsBatch(USER_ID, PC_ID, [makeItem("a")])).rejects.toThrow("PC not found");
    expect(holdingUpsert).not.toHaveBeenCalled();
  });

  it("logs one aggregated activity entry for the whole batch, not one per row", async () => {
    holdingUpsert.mockResolvedValue({});
    await addHoldingsBatch(USER_ID, PC_ID, [makeItem("a"), makeItem("b")]);

    expect(activityLogCreate).toHaveBeenCalledTimes(1);
    expect(activityLogCreate.mock.calls[0][0].data.summary).toContain("2 cards");
  });

  it("logs nothing when every item fails", async () => {
    holdingUpsert.mockRejectedValue(new Error("nope"));
    await addHoldingsBatch(USER_ID, PC_ID, [makeItem("a")]);

    expect(activityLogCreate).not.toHaveBeenCalled();
  });
});
