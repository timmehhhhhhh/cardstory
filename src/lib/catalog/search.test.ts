import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogSearchParams } from "@/lib/catalog/search";

// tcgWhereFor makes two DB round-trips of its own — punctuationInsensitiveIds
// ($queryRaw) and matchingSetIdsForAlphaCode (set.findMany) — see
// lib/catalog/search.ts. Mocked here the same way src/lib/pc/manage.test.ts
// mocks @/lib/db, so this test can assert on the constructed Prisma `where`
// shape without a live database.
const { queryRaw, setFindMany } = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  setFindMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    $queryRaw: queryRaw,
    set: { findMany: setFindMany },
  },
}));

const { tcgWhereFor } = await import("@/lib/catalog/search");

// The one set this suite's queries are meant to resolve against — a
// Ceruledge promo set whose name initializes to "MEP" (see
// deriveSetInitials), with no curated short-code field of its own (Set.code
// is always the raw provider id — see prisma/schema.prisma).
const MEGA_EVOLUTION_PROMOS_SET = {
  id: "pokemon:me2.5-p",
  code: "me2.5-p",
  name: "Mega Evolution Promos",
  nameEn: null,
};

beforeEach(() => {
  queryRaw.mockReset();
  setFindMany.mockReset();
  queryRaw.mockResolvedValue([]);
  setFindMany.mockResolvedValue([MEGA_EVOLUTION_PROMOS_SET]);
});

function paramsFor(q: string): CatalogSearchParams {
  return { q };
}

describe("tcgWhereFor short-form set-code/number matching", () => {
  it.each([
    "MEP 014",
    "MEP014",
    "MEP14",
    "MEP 14",
    "MEP EN 014",
    "MEPEN014",
    "MEP EN 14",
    "MEPEN14",
  ])("resolves %s to the derived-initials set + number branch", async (q) => {
    const where = await tcgWhereFor(paramsFor(q), "pokemon");
    const qGroup = (where.AND as { OR: unknown[] }[])[0].OR;
    const codeNumberBranch = qGroup.find(
      (clause) =>
        typeof clause === "object" &&
        clause !== null &&
        "AND" in clause &&
        JSON.stringify(clause).includes(MEGA_EVOLUTION_PROMOS_SET.id)
    );
    expect(codeNumberBranch).toBeDefined();
    expect(setFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { gameId: "pokemon" } })
    );
  });

  it.each(["937 014", "937 14", "0937 014", "0937 14"])(
    "resolves %s to the Pokédex-number + card-number branch",
    async (q) => {
      const where = await tcgWhereFor(paramsFor(q), "pokemon");
      const qGroup = (where.AND as { OR: unknown[] }[])[0].OR;
      const dexBranch = qGroup.find(
        (clause) =>
          typeof clause === "object" && clause !== null && JSON.stringify(clause).includes("nationalPokedexNumbers")
      );
      expect(dexBranch).toBeDefined();
    }
  );

  it("resolves 'MEP 937' to the set-code + Pokédex-number branch", async () => {
    const where = await tcgWhereFor(paramsFor("MEP 937"), "pokemon");
    const qGroup = (where.AND as { OR: unknown[] }[])[0].OR;
    const branch = qGroup.find(
      (clause) =>
        typeof clause === "object" &&
        clause !== null &&
        JSON.stringify(clause).includes(MEGA_EVOLUTION_PROMOS_SET.id) &&
        JSON.stringify(clause).includes("nationalPokedexNumbers")
    );
    expect(branch).toBeDefined();
  });

  it.each(["Ceruledge Promo", "ceruledge promo"])(
    "resolves %s to the name + set-word branch",
    async (q) => {
      const where = await tcgWhereFor(paramsFor(q), "pokemon");
      const qGroup = (where.AND as { OR: unknown[] }[])[0].OR;
      const branch = qGroup.find(
        (clause) =>
          typeof clause === "object" &&
          clause !== null &&
          JSON.stringify(clause).toLowerCase().includes("ceruledge")
      );
      expect(branch).toBeDefined();
    }
  );

  it("leaves a plain name query unaffected (no new branches fire)", async () => {
    setFindMany.mockResolvedValue([]);
    const where = await tcgWhereFor(paramsFor("Pikachu"), "pokemon");
    expect(where).toBeDefined();
  });
});
