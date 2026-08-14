import { db } from "@/lib/db";
import type { Holding, NewHoldingInput, Portfolio } from "@/lib/portfolio/types";
import type { ImportPortfolio } from "@/lib/portfolio/api-schemas";

/**
 * Server-backed portfolio storage for signed-in users — the accounts
 * equivalent of src/lib/portfolio/local-store.ts. Every function here
 * takes the requesting userId and re-checks row ownership itself (never
 * trusting that a valid session alone means the caller owns the
 * portfolio/holding id in question — those ids are client-supplied).
 */

function toHolding(row: {
  id: string;
  kind: string;
  catalogItemId: string | null;
  sportsCardItemId: string | null;
  quantity: number;
  condition: string;
  gradeCompany: string | null;
  gradeValue: string | null;
  serialNumber: string | null;
  language: string;
  costBasisTotal: unknown;
  costBasisCurrency: string;
  acquiredAt: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Holding {
  return {
    id: row.id,
    kind: row.kind as Holding["kind"],
    catalogItemId: row.catalogItemId ?? undefined,
    sportsCardItemId: row.sportsCardItemId ?? undefined,
    quantity: row.quantity,
    condition: row.condition as Holding["condition"],
    gradeCompany: row.gradeCompany ?? undefined,
    gradeValue: row.gradeValue ?? undefined,
    serialNumber: row.serialNumber ?? undefined,
    language: row.language as Holding["language"],
    costBasisTotal: Number(row.costBasisTotal),
    costBasisCurrency: row.costBasisCurrency as Holding["costBasisCurrency"],
    acquiredAt: row.acquiredAt.toISOString(),
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** All of a user's portfolios, each with its holdings, oldest-created first. */
export async function listPortfolios(userId: string): Promise<Portfolio[]> {
  const rows = await db.portfolio.findMany({
    where: { userId },
    include: { holdings: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    createdAt: p.createdAt.toISOString(),
    holdings: p.holdings.map(toHolding),
  }));
}

/** Creates the user's first portfolio if they somehow have none yet. */
export async function ensureDefaultPortfolio(userId: string): Promise<Portfolio> {
  const existing = await db.portfolio.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
  if (existing) return { id: existing.id, name: existing.name, createdAt: existing.createdAt.toISOString(), holdings: [] };
  const created = await db.portfolio.create({ data: { userId, name: "Main" } });
  return { id: created.id, name: created.name, createdAt: created.createdAt.toISOString(), holdings: [] };
}

export async function createPortfolio(userId: string, id: string, name: string): Promise<void> {
  await db.portfolio.create({ data: { id, userId, name } });
}

async function assertOwnsPortfolio(userId: string, portfolioId: string): Promise<void> {
  const portfolio = await db.portfolio.findUnique({ where: { id: portfolioId }, select: { userId: true } });
  if (!portfolio || portfolio.userId !== userId) {
    throw new Error("Portfolio not found");
  }
}

export async function renamePortfolio(userId: string, portfolioId: string, name: string): Promise<void> {
  await assertOwnsPortfolio(userId, portfolioId);
  await db.portfolio.update({ where: { id: portfolioId }, data: { name } });
}

export async function deletePortfolio(userId: string, portfolioId: string): Promise<void> {
  await assertOwnsPortfolio(userId, portfolioId);
  await db.portfolio.delete({ where: { id: portfolioId } });
}

export async function addHolding(
  userId: string,
  portfolioId: string,
  input: NewHoldingInput & { id: string }
): Promise<void> {
  await assertOwnsPortfolio(userId, portfolioId);
  await db.holding.create({
    data: {
      id: input.id,
      portfolioId,
      kind: input.kind ?? "tcg",
      catalogItemId: input.catalogItemId,
      sportsCardItemId: input.sportsCardItemId,
      quantity: input.quantity,
      condition: input.condition,
      gradeCompany: input.gradeCompany,
      gradeValue: input.gradeValue,
      serialNumber: input.serialNumber,
      language: input.language,
      costBasisTotal: input.costBasisTotal,
      costBasisCurrency: input.costBasisCurrency,
      acquiredAt: new Date(input.acquiredAt),
      notes: input.notes,
    },
  });
}

async function assertOwnsHolding(userId: string, holdingId: string): Promise<void> {
  const holding = await db.holding.findUnique({
    where: { id: holdingId },
    select: { portfolio: { select: { userId: true } } },
  });
  if (!holding || holding.portfolio.userId !== userId) {
    throw new Error("Holding not found");
  }
}

export async function updateHolding(
  userId: string,
  holdingId: string,
  patch: Partial<Omit<Holding, "id">>
): Promise<void> {
  await assertOwnsHolding(userId, holdingId);
  const { acquiredAt, ...rest } = patch;
  await db.holding.update({
    where: { id: holdingId },
    data: {
      ...rest,
      ...(acquiredAt ? { acquiredAt: new Date(acquiredAt) } : {}),
    },
  });
}

export async function removeHoldings(userId: string, portfolioId: string, holdingIds: string[]): Promise<void> {
  await assertOwnsPortfolio(userId, portfolioId);
  await db.holding.deleteMany({ where: { portfolioId, id: { in: holdingIds } } });
}

export async function transferHoldings(
  userId: string,
  fromId: string,
  toId: string,
  holdingIds: string[],
  mode: "copy" | "move"
): Promise<void> {
  await assertOwnsPortfolio(userId, fromId);
  await assertOwnsPortfolio(userId, toId);

  const holdings = await db.holding.findMany({ where: { portfolioId: fromId, id: { in: holdingIds } } });

  await db.$transaction(async (tx) => {
    for (const h of holdings) {
      await tx.holding.create({
        data: {
          portfolioId: toId,
          kind: h.kind,
          catalogItemId: h.catalogItemId,
          sportsCardItemId: h.sportsCardItemId,
          quantity: h.quantity,
          condition: h.condition,
          gradeCompany: h.gradeCompany,
          gradeValue: h.gradeValue,
          serialNumber: h.serialNumber,
          language: h.language,
          costBasisTotal: h.costBasisTotal,
          costBasisCurrency: h.costBasisCurrency,
          acquiredAt: h.acquiredAt,
          notes: h.notes,
        },
      });
    }
    if (mode === "move") {
      await tx.holding.deleteMany({ where: { portfolioId: fromId, id: { in: holdingIds } } });
    }
  });
}

/**
 * One-time import of a browser's entire local portfolio payload into the
 * user's account, preserving ids so the caller's optimistic client state
 * doesn't need to change shape. Runs as a single transaction — if any part
 * fails, nothing is partially imported (the local copy is never deleted
 * either way, so a failed import is simply safe to retry).
 */
export async function importLocalPortfolio(
  userId: string,
  portfolios: ImportPortfolio[]
): Promise<void> {
  const importedIds: string[] = [];

  await db.$transaction(async (tx) => {
    for (const p of portfolios) {
      if (p.holdings.length === 0) continue;
      importedIds.push(p.id);
      await tx.portfolio.upsert({
        where: { id: p.id },
        create: { id: p.id, userId, name: p.name },
        update: {},
      });
      for (const h of p.holdings) {
        await tx.holding.upsert({
          where: { id: h.id },
          create: {
            id: h.id,
            portfolioId: p.id,
            kind: h.kind ?? "tcg",
            catalogItemId: h.catalogItemId,
            sportsCardItemId: h.sportsCardItemId,
            quantity: h.quantity,
            condition: h.condition,
            gradeCompany: h.gradeCompany,
            gradeValue: h.gradeValue,
            serialNumber: h.serialNumber,
            language: h.language,
            costBasisTotal: h.costBasisTotal,
            costBasisCurrency: h.costBasisCurrency,
            acquiredAt: new Date(h.acquiredAt),
            notes: h.notes,
          },
          update: {},
        });
      }
    }

    // GET /api/portfolio (ensureDefaultPortfolio) may have already created
    // an empty "Main" portfolio for this user before the import prompt was
    // answered — a race between the eager portfolio fetch and the user's
    // import decision. Clean up any such empty portfolios now that real
    // data has landed, so the account isn't left with a stray duplicate.
    if (importedIds.length > 0) {
      await tx.portfolio.deleteMany({
        where: { userId, id: { notIn: importedIds }, holdings: { none: {} } },
      });
    }
  });
}
