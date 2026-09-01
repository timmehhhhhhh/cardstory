/**
 * 2025-26 Topps Chrome Basketball checklist seed: upserts every base card
 * (#1-300, #226 not released) plus its full named-parallel list as
 * SportsCardItem rows — see src/lib/sportscards/manage.ts for the "one row
 * per parallel, upserted by a deterministic externalKey" model this shares
 * with scripts/seed-lamelo-ball.ts.
 *
 * Unlike LaMelo Ball's checklist (organized per-player, spanning many
 * product lines), this is organized per-set — one product, so every row
 * shares the same year/distributor/setName/releaseDate, and the named
 * parallel list (scripts/data/topps-chrome-2025/parallels.ts) is identical
 * across every base card except the conditional Image Variation tier (see
 * BaseCardEntry.hasImageVariation in scripts/data/topps-chrome-2025/types.ts).
 *
 * imageUrl/sourceUrl are backfilled from TCDB scans via
 * ./data/topps-chrome-2025/tcdb-images.ts (see that file's header for how
 * those were sourced) — a base card gets its own scan, and every
 * BASE_PARALLELS row inherits it (imageIsInherited: true); a card with
 * hasImageVariation gets a second, distinct scan for its "Image Variation"
 * tier, which the plain "Image Variation" parallel owns for real and its
 * colored siblings ("Green Image Variation", etc.) inherit in turn. No
 * per-parallel scan otherwise exists, still, no prices are seeded.
 *
 * TCDB's image host doesn't tolerate many hotlinked embeds loading on one
 * page at once (see scripts/data/lamelo-ball/2022-23.ts's header comment,
 * which is why LaMelo Ball's checklist has no imageUrl at all) — this is
 * fine today only because no checklist-grid page exists yet for this set.
 * Whoever builds one should test with referrerPolicy="no-referrer" and/or
 * lazy-loading first, and be ready to swap image hosts if TCDB rate-limits
 * it once many of these load on one page.
 *
 * Run with: npx tsx scripts/seed-topps-chrome-2025.ts
 * Re-run any time — everything here is an upsert keyed by externalKey, so
 * it's safe to repeat after editing base-set.ts or parallels.ts.
 */
import { PrismaClient } from "@prisma/client";
import { upsertChecklistSportsCardItem, computeExternalKey } from "@/lib/sportscards/manage";
import { BASE_SET } from "./data/topps-chrome-2025/base-set";
import { BASE_PARALLELS, IMAGE_VARIATION_PARALLELS } from "./data/topps-chrome-2025/parallels";
import { BASE_CARD_TCDB, IMAGE_VARIATION_TCDB, tcdbImageUrl, tcdbSourceUrl } from "./data/topps-chrome-2025/tcdb-images";

const YEAR = 2025;
const DISTRIBUTOR = "Topps";
const SET_NAME = "Chrome";
// tcdb.com/ViewSet.cfm/sid/574514/2025-26-Topps-Chrome — "Release Date: December 18, 2025"
const RELEASE_DATE = new Date("2025-12-18T00:00:00.000Z");

// tcdb-images.ts is hand-maintained separately from base-set.ts's
// hasImageVariation flags — catch the two drifting apart before seeding
// anything, rather than silently seeding some Image Variation cards
// without their real scan.
function checkImageVariationCoverage() {
  const flagged = new Set(BASE_SET.filter((c) => c.hasImageVariation).map((c) => c.cardNumber));
  const covered = new Set(Object.keys(IMAGE_VARIATION_TCDB));
  const missing = [...flagged].filter((n) => !covered.has(n));
  const extra = [...covered].filter((n) => !flagged.has(n));
  if (missing.length || extra.length) {
    throw new Error(
      `IMAGE_VARIATION_TCDB out of sync with base-set.ts's hasImageVariation flags — ` +
        `missing: [${missing.join(", ")}], extra: [${extra.join(", ")}]`
    );
  }
}

async function main() {
  checkImageVariationCoverage();

  const db = new PrismaClient();
  let total = 0;
  const seenKeys = new Set<string>();

  for (const card of BASE_SET) {
    const tcdbRef = BASE_CARD_TCDB[card.cardNumber];
    if (!tcdbRef) throw new Error(`No TCDB reference for card #${card.cardNumber} ${card.playerName}`);

    const base = {
      sport: "NBA" as const,
      year: YEAR,
      distributor: DISTRIBUTOR,
      setName: SET_NAME,
      playerName: card.playerName,
      teamName: card.teamName,
      cardNumber: card.cardNumber,
      cardType: "base" as const,
      releaseDate: RELEASE_DATE,
      imageUrl: tcdbImageUrl(tcdbRef),
      sourceUrl: tcdbSourceUrl(tcdbRef),
    };

    // Catch accidental duplicate card numbers in base-set.ts before they
    // silently collapse into one upserted row.
    const baseKey = computeExternalKey(base);
    if (seenKeys.has(baseKey)) {
      console.warn(`Duplicate card number, skipping: #${card.cardNumber} ${card.playerName}`);
      continue;
    }
    seenKeys.add(baseKey);

    // The base card itself is a genuine scan (imageIsInherited defaults to
    // false in upsertChecklistSportsCardItem).
    await upsertChecklistSportsCardItem(base);
    total++;

    for (const parallel of BASE_PARALLELS) {
      await upsertChecklistSportsCardItem({
        ...base,
        parallelName: parallel.name,
        serialLimit: parallel.serialLimit,
        // Inherits the base card's own photo — no per-parallel scan exists.
        imageIsInherited: true,
      });
      total++;
    }

    if (card.hasImageVariation) {
      const variationRef = IMAGE_VARIATION_TCDB[card.cardNumber];
      const variationImageUrl = tcdbImageUrl(variationRef);
      const variationSourceUrl = tcdbSourceUrl(variationRef);

      for (const parallel of IMAGE_VARIATION_PARALLELS) {
        await upsertChecklistSportsCardItem({
          ...base,
          parallelName: parallel.name,
          serialLimit: parallel.serialLimit,
          imageUrl: variationImageUrl,
          sourceUrl: variationSourceUrl,
          // The plain "Image Variation" row is the real scan; its colored
          // siblings (Green/Gold/Orange/etc.) inherit that same photo.
          imageIsInherited: parallel.name !== "Image Variation",
        });
        total++;
      }
    }
  }

  console.log(`Done. ${total} SportsCardItem rows upserted across ${BASE_SET.length} base cards.`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
