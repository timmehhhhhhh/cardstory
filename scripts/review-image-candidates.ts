/**
 * Human review/apply CLI for `CrawledImageCandidate` rows — the Postgres-
 * backed replacement for the old crawl -> `verified: false` JSON -> hand-
 * edit -> flip -> seed pipeline (scripts/crawl-pokemon-ja-images.ts,
 * scripts/seed-card-images.ts), which has no filesystem to write review
 * JSON to under Cloudflare Workers (see prisma/schema.prisma's
 * CrawledImageCandidate doc comment).
 *
 * Every crawl job under src/lib/automation/ stages its matches here with
 * status "pending" — nothing it finds is ever written straight into
 * CatalogItem/Set/SportsCardItem. This script is how a human reviews and
 * either applies or rejects them.
 *
 * Run with:
 *   npx tsx scripts/review-image-candidates.ts list [--source=<source>] [--status=pending|applied|rejected|auto-applied]
 *   npx tsx scripts/review-image-candidates.ts apply <id> [<id> ...]
 *   npx tsx scripts/review-image-candidates.ts reject <id> [<id> ...] [--note="..."]
 */
import { db } from "@/lib/db";
import { applyCatalogImagePatches } from "@/lib/catalog/images";

function argValue(name: string): string | undefined {
  const raw = process.argv.find((a) => a.startsWith(`--${name}=`));
  return raw?.slice(name.length + 3);
}

async function list() {
  const source = argValue("source");
  const status = argValue("status") ?? "pending";
  const rows = await db.crawledImageCandidate.findMany({
    where: { ...(source ? { source } : {}), status },
    orderBy: { discoveredAt: "desc" },
    take: 200,
  });

  if (rows.length === 0) {
    console.log(`No ${status} candidates${source ? ` for source "${source}"` : ""}.`);
    return;
  }

  console.log(`${rows.length} ${status} candidate(s)${source ? ` for source "${source}"` : ""} (newest first, capped at 200):\n`);
  for (const r of rows) {
    const target =
      r.targetType === "catalogItem"
        ? `${r.catalogItemGameId}:${r.catalogItemExternalId}`
        : r.targetType === "set"
          ? r.setId
          : r.sportsCardItemId;
    console.log(
      `  ${r.id}  [${r.source}] ${r.targetType} ${target}\n` +
        `      image: ${r.imageUrl ?? "—"}${r.imageBackUrl ? ` (back: ${r.imageBackUrl})` : ""}${r.logoUrl ? ` logo: ${r.logoUrl}` : ""}\n` +
        `      source: ${r.sourceUrl}`
    );
  }
}

async function applyOne(candidate: NonNullable<Awaited<ReturnType<typeof db.crawledImageCandidate.findUnique>>>): Promise<string> {
  if (candidate.status !== "pending") return `already ${candidate.status} — skipped`;

  if (candidate.targetType === "catalogItem") {
    if (!candidate.catalogItemGameId || !candidate.catalogItemExternalId || !candidate.imageUrl) {
      return "missing gameId/externalId/imageUrl — skipped";
    }
    const summary = await applyCatalogImagePatches([
      {
        gameId: candidate.catalogItemGameId,
        externalId: candidate.catalogItemExternalId,
        imageSmallUrl: candidate.imageUrl,
        imageLargeUrl: candidate.imageUrl,
      },
    ]);
    await db.crawledImageCandidate.update({
      where: { id: candidate.id },
      data: { status: "applied", reviewedAt: new Date() },
    });
    return `catalogItem: ${JSON.stringify(summary)}`;
  }

  if (candidate.targetType === "set") {
    if (!candidate.setId || !candidate.logoUrl) return "missing setId/logoUrl — skipped";
    const res = await db.set.updateMany({
      where: { id: candidate.setId, logoUrl: null },
      data: { logoUrl: candidate.logoUrl },
    });
    await db.crawledImageCandidate.update({
      where: { id: candidate.id },
      data: { status: "applied", reviewedAt: new Date() },
    });
    return res.count > 0 ? "set logoUrl filled" : "set already had a logoUrl — left alone";
  }

  if (candidate.targetType === "sportsCardItem") {
    if (!candidate.sportsCardItemId) return "missing sportsCardItemId — skipped";
    await db.sportsCardItem.update({
      where: { id: candidate.sportsCardItemId },
      data: {
        ...(candidate.imageUrl ? { imageUrl: candidate.imageUrl } : {}),
        ...(candidate.imageBackUrl ? { imageBackUrl: candidate.imageBackUrl } : {}),
        ...(candidate.logoUrl ? { setLogoUrl: candidate.logoUrl } : {}),
        sourceUrl: candidate.sourceUrl,
      },
    });
    await db.crawledImageCandidate.update({
      where: { id: candidate.id },
      data: { status: "applied", reviewedAt: new Date() },
    });
    return "sportsCardItem updated";
  }

  return `unknown targetType "${candidate.targetType}" — skipped`;
}

async function apply(ids: string[]) {
  if (ids.length === 0) {
    console.error("Usage: review-image-candidates.ts apply <id> [<id> ...]");
    process.exit(1);
  }
  for (const id of ids) {
    const candidate = await db.crawledImageCandidate.findUnique({ where: { id } });
    if (!candidate) {
      console.log(`${id}: not found`);
      continue;
    }
    const result = await applyOne(candidate);
    console.log(`${id}: ${result}`);
  }
}

async function reject(ids: string[]) {
  if (ids.length === 0) {
    console.error("Usage: review-image-candidates.ts reject <id> [<id> ...] [--note=\"...\"]");
    process.exit(1);
  }
  const note = argValue("note");
  const res = await db.crawledImageCandidate.updateMany({
    where: { id: { in: ids }, status: "pending" },
    data: { status: "rejected", reviewedAt: new Date(), reviewNote: note ?? null },
  });
  console.log(`Rejected ${res.count} of ${ids.length} requested id(s) (others were not pending).`);
}

async function main() {
  const cmd = process.argv[2];
  const rest = process.argv.slice(3).filter((a) => !a.startsWith("--"));

  if (cmd === "list") await list();
  else if (cmd === "apply") await apply(rest);
  else if (cmd === "reject") await reject(rest);
  else {
    console.error(
      "Usage:\n" +
        "  review-image-candidates.ts list [--source=<source>] [--status=pending|applied|rejected|auto-applied]\n" +
        "  review-image-candidates.ts apply <id> [<id> ...]\n" +
        '  review-image-candidates.ts reject <id> [<id> ...] [--note="..."]'
    );
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
