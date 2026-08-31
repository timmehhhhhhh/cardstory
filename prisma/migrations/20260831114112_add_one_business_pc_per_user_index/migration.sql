-- Enforces at most one "business"-kind portfolio per user.
--
-- Prisma's schema DSL can't express a partial unique index (only a plain
-- @@unique across all rows, which would also wrongly cap "personal" PCs at
-- one per user), so this is raw SQL. Backstops the app-level fix in
-- ensureBusinessPC (src/lib/pc/manage.ts) for the duplicate "Business
-- Inventory" PC bug — see that function's doc comment — so the invariant
-- holds even if some future code path inserts a portfolio directly.
--
-- Self-healing: dedupes any existing "business" duplicates in-place before
-- creating the index, so `prisma migrate deploy` can't fail with a 23505
-- unique-violation on a database that already has some (as production did
-- on first attempt — see scripts/merge-duplicate-business-pcs.ts, the
-- standalone/dry-run/logging version of this same merge, which this inline
-- copy makes non-mandatory rather than replaces). For each user with more
-- than one business portfolio: keep the oldest (by createdAt), reparent
-- every holding on the others onto it, then delete the now-empty others.
DO $$
DECLARE
  dup RECORD;
  winner_id TEXT;
BEGIN
  FOR dup IN
    SELECT "userId"
    FROM portfolios
    WHERE kind = 'business'
    GROUP BY "userId"
    HAVING COUNT(*) > 1
  LOOP
    SELECT id INTO winner_id
    FROM portfolios
    WHERE "userId" = dup."userId" AND kind = 'business'
    ORDER BY "createdAt" ASC
    LIMIT 1;

    UPDATE holdings
    SET "portfolioId" = winner_id
    WHERE "portfolioId" IN (
      SELECT id FROM portfolios
      WHERE "userId" = dup."userId" AND kind = 'business' AND id <> winner_id
    );

    DELETE FROM portfolios
    WHERE "userId" = dup."userId" AND kind = 'business' AND id <> winner_id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX "portfolios_one_business_pc_per_user"
ON "portfolios" ("userId")
WHERE "kind" = 'business';
