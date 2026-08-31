/**
 * One-off cleanup: merges duplicate kind: "business" Portfolio ("Business
 * Inventory" PC) rows down to one per user.
 *
 * Root cause (fixed alongside this script — see ensureBusinessPC in
 * src/lib/pc/manage.ts): the client-side find-or-create previously checked
 * only an in-memory React Query cache, with no server-side idempotency or DB
 * uniqueness backstop, so several near-simultaneous triggers (rapid
 * quick-add clicks, multiple business-mode panels mounting close together)
 * could each conclude "no business PC exists yet" and insert their own row.
 * This script cleans up whatever that left behind; the code fix + the
 * partial unique index in migration
 * 20260831114112_add_one_business_pc_per_user_index stop it recurring.
 *
 * For each user with more than one "business" portfolio:
 *   1. Picks a winner (earliest createdAt).
 *   2. Reparents every holding on the losing portfolios onto the winner.
 *   3. Deletes the now-empty losing portfolios.
 * All three steps run inside one transaction per user, so a user is never
 * left half-merged.
 *
 * The winner keeps its original id (not renamed to `business-${userId}`) —
 * ensureBusinessPC looks up by (userId, kind), not by id, so this is fine
 * and avoids the extra complexity of repointing a primary key.
 *
 * Also reports (does NOT auto-merge) any lingering duplicate kind:
 * "personal" name: "Main" portfolios, in case any predate the equivalent
 * ensureDefaultPC fix — that path already guards against new ones, so
 * finding any here would be surprising and worth investigating by hand
 * rather than silently merging.
 *
 * IMPORTANT: run this BEFORE deploying the
 * add_one_business_pc_per_user_index migration on any database that may
 * already have duplicates — that migration's CREATE UNIQUE INDEX will fail
 * outright if duplicates still exist.
 *
 * Safe to re-run: a second run finds zero users with >1 business portfolio.
 *
 * Run with: npx tsx scripts/merge-duplicate-business-pcs.ts [--dry-run]
 */
import { db } from "../src/lib/db";

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const dupeUsers = await db.portfolio.groupBy({
    by: ["userId"],
    where: { kind: "business" },
    _count: { _all: true },
    having: { userId: { _count: { gt: 1 } } },
  });

  if (dupeUsers.length === 0) {
    console.log("No users with duplicate Business Inventory PCs found.");
  } else {
    console.log(`Found ${dupeUsers.length} user(s) with duplicate Business Inventory PCs:\n`);

    let totalPortfoliosMerged = 0;
    let totalHoldingsMoved = 0;

    for (const { userId } of dupeUsers) {
      const portfolios = await db.portfolio.findMany({
        where: { userId, kind: "business" },
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { holdings: true } } },
      });

      const [winner, ...losers] = portfolios;
      const holdingsToMove = losers.reduce((sum, p) => sum + p._count.holdings, 0);

      console.log(
        `[${userId}] winner=${winner.id} (created ${winner.createdAt.toISOString()}), ` +
          `merging ${losers.length} duplicate(s): ${losers.map((p) => p.id).join(", ")} ` +
          `(${holdingsToMove} holding(s) to move)`
      );

      if (dryRun) {
        console.log(`  (dry-run) would move ${holdingsToMove} holding(s) and delete ${losers.length} portfolio(s)`);
        continue;
      }

      await db.$transaction([
        db.holding.updateMany({
          where: { portfolioId: { in: losers.map((p) => p.id) } },
          data: { portfolioId: winner.id },
        }),
        db.portfolio.deleteMany({
          where: { id: { in: losers.map((p) => p.id) } },
        }),
      ]);

      totalPortfoliosMerged += losers.length;
      totalHoldingsMoved += holdingsToMove;
      console.log(`  merged ${losers.length} portfolio(s), moved ${holdingsToMove} holding(s)`);
    }

    console.log(
      dryRun
        ? "\nDry run complete — no rows were changed."
        : `\nDone. ${totalPortfoliosMerged} duplicate portfolio(s) merged across ${dupeUsers.length} user(s), ` +
            `${totalHoldingsMoved} holding(s) moved.`
    );
  }

  // Bonus check, not auto-merged — see doc comment above.
  const dupeMains = await db.portfolio.groupBy({
    by: ["userId"],
    where: { kind: "personal", name: "Main" },
    _count: { _all: true },
    having: { userId: { _count: { gt: 1 } } },
  });
  if (dupeMains.length > 0) {
    console.log(
      `\nNote: found ${dupeMains.length} user(s) with more than one "Main" personal PC ` +
        `(userIds: ${dupeMains.map((d) => d.userId).join(", ")}) — this predates ensureDefaultPC's ` +
        "fix and was NOT auto-merged by this script; investigate by hand."
    );
  }

  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
