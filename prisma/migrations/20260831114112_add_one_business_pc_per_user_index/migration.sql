-- Enforces at most one "business"-kind portfolio per user.
--
-- Prisma's schema DSL can't express a partial unique index (only a plain
-- @@unique across all rows, which would also wrongly cap "personal" PCs at
-- one per user), so this is raw SQL. Backstops the app-level fix in
-- ensureBusinessPC (src/lib/pc/manage.ts) for the duplicate "Business
-- Inventory" PC bug — see that function's doc comment — so the invariant
-- holds even if some future code path inserts a portfolio directly.
--
-- Run scripts/data/merge-duplicate-business-pcs.ts BEFORE this migration on
-- any database that may already have duplicates, or this CREATE UNIQUE
-- INDEX will fail outright.
CREATE UNIQUE INDEX "portfolios_one_business_pc_per_user"
ON "portfolios" ("userId")
WHERE "kind" = 'business';
