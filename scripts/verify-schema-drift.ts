/**
 * Independent, DDL-blind check that every column/table Prisma's migration
 * *files* say should exist actually exists in the live database — by asking
 * Postgres directly (`information_schema.columns`), not by trusting the
 * `_prisma_migrations` bookkeeping table.
 *
 * This exists because `_prisma_migrations` saying a migration is "applied"
 * does not guarantee its DDL ran: on 2026-08-25 and again on 2026-08-26,
 * migrations were recorded as applied while the live `holdings`/other tables
 * were still missing the columns those migrations were supposed to add,
 * and `prisma migrate status` / `prisma migrate deploy` both happily
 * reported "up to date" because they only ever consult that same
 * bookkeeping table. This script cross-checks reality instead.
 *
 * Run with: npm run verify:schema
 * (wired into `predeploy` and the CI `build:ci` script — see package.json
 * and the "Deploying" section of README.md for why those two paths differ
 * and why both need this.)
 *
 * Exits non-zero — and prints exactly which columns are missing from which
 * table — if anything is out of sync, so it fails loudly instead of
 * silently shipping a Worker that will throw on every request touching the
 * affected table.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const MIGRATIONS_DIR = path.resolve(process.cwd(), "prisma/migrations");

type ColumnKey = `${string}.${string}`;

/**
 * Walk every migration.sql in order (directory names are timestamp-prefixed,
 * so lexical order is chronological) and replay just enough of the DDL to
 * know which columns should currently exist per table. Handles the DDL
 * shapes Prisma actually generates for this schema: CREATE TABLE, ALTER
 * TABLE ... ADD COLUMN, ALTER TABLE ... DROP COLUMN, ALTER TABLE ... RENAME
 * COLUMN, and DROP TABLE. Anything else (index/enum/FK DDL) doesn't affect
 * column existence and is ignored.
 */
function expectedColumns(): Map<string, Set<string>> {
  const tables = new Map<string, Set<string>>();

  if (!existsSync(MIGRATIONS_DIR)) return tables;

  const dirs = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const dir of dirs) {
    const file = path.join(MIGRATIONS_DIR, dir, "migration.sql");
    if (!existsSync(file)) continue;
    // Strip Prisma's `-- CreateTable` / `-- AlterTable` / etc. comment
    // lines, and its `/* Warnings: ... */` block comments (emitted before
    // destructive statements like DROP COLUMN), so each statement below
    // starts directly with its SQL keyword rather than a comment. Without
    // stripping block comments too, a leading `/* Warnings: ... */` used to
    // make the DROP COLUMN statement fail to match the ALTER TABLE regex
    // below, leaving the dropped column incorrectly "expected" forever.
    const sql = readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n");

    // Split on statement-terminating semicolons; good enough for Prisma's
    // generated migration SQL, which never embeds a literal `;` inside a
    // string in these DDL shapes.
    for (const rawStatement of sql.split(";")) {
      const statement = rawStatement.trim();
      if (!statement) continue;

      let m: RegExpMatchArray | null;

      if ((m = statement.match(/^CREATE TABLE\s+"(\w+)"\s*\(([\s\S]*)\)$/i))) {
        const [, table, body] = m;
        const cols = tables.get(table) ?? new Set<string>();
        for (const colMatch of body.matchAll(/(?:^|,)\s*"(\w+)"/g)) {
          cols.add(colMatch[1]);
        }
        tables.set(table, cols);
        continue;
      }

      if ((m = statement.match(/^DROP TABLE\s+(?:IF EXISTS\s+)?"(\w+)"/i))) {
        tables.delete(m[1]);
        continue;
      }

      if ((m = statement.match(/^ALTER TABLE\s+"(\w+)"\s*([\s\S]*)$/i))) {
        const [, table, ops] = m;
        const cols = tables.get(table) ?? new Set<string>();
        for (const add of ops.matchAll(/ADD COLUMN\s+(?:IF NOT EXISTS\s+)?"(\w+)"/gi)) {
          cols.add(add[1]);
        }
        for (const drop of ops.matchAll(/DROP COLUMN\s+(?:IF EXISTS\s+)?"(\w+)"/gi)) {
          cols.delete(drop[1]);
        }
        for (const rename of ops.matchAll(
          /RENAME COLUMN\s+"(\w+)"\s+TO\s+"(\w+)"/gi
        )) {
          cols.delete(rename[1]);
          cols.add(rename[2]);
        }
        tables.set(table, cols);
        continue;
      }
    }
  }

  return tables;
}

async function actualColumns(prisma: PrismaClient): Promise<Set<ColumnKey>> {
  const rows = await prisma.$queryRaw<{ table_name: string; column_name: string }[]>`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `;
  return new Set(rows.map((r) => `${r.table_name}.${r.column_name}` as ColumnKey));
}

async function main() {
  const expected = expectedColumns();
  if (expected.size === 0) {
    console.log("verify:schema — no migrations found, nothing to check.");
    return;
  }

  const prisma = new PrismaClient();
  let actual: Set<ColumnKey>;
  try {
    actual = await actualColumns(prisma);
  } finally {
    await prisma.$disconnect();
  }

  const missing: { table: string; column: string }[] = [];
  for (const [table, columns] of expected) {
    // A table that doesn't exist at all yet is reported as one row per
    // expected column, rather than special-cased, so the output stays
    // uniform and still names every missing column.
    for (const column of columns) {
      if (!actual.has(`${table}.${column}` as ColumnKey)) {
        missing.push({ table, column });
      }
    }
  }

  if (missing.length === 0) {
    console.log(
      `verify:schema — OK, all ${[...expected.values()].reduce((n, s) => n + s.size, 0)} expected columns across ${expected.size} tables exist in the live database.`
    );
    return;
  }

  console.error(
    `\n❌ verify:schema — ${missing.length} column(s) that prisma/migrations/ says should exist are MISSING from the live database:\n`
  );
  for (const { table, column } of missing) {
    console.error(`   - ${table}.${column}`);
  }
  console.error(
    `\nThis means _prisma_migrations is out of sync with the actual schema — a migration is` +
      ` recorded as applied but its DDL never ran (see the "Deploying" section of README.md).` +
      ` Do NOT deploy Worker code that depends on these columns until this is fixed, e.g. by` +
      ` running the specific migration's SQL directly:\n` +
      `   npx prisma db execute --file prisma/migrations/<dir>/migration.sql --schema prisma/schema.prisma\n`
  );
  process.exit(1);
}

main().catch((err) => {
  console.error("verify:schema — failed to run:", err);
  process.exit(1);
});
