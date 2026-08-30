/**
 * One-time backfill: assigns CatalogItem.cardFamilyId to Pokémon rows,
 * linking reprints (the same card across different sets/years) and
 * language variants (the same card across languages) into one family —
 * see the field's doc comment in prisma/schema.prisma.
 *
 * Heuristic (Pokémon-only): rows are grouped by a normalized key of
 * `(nameEn ?? name)` + sorted `nationalPokedexNumbers` + `artist`. Any
 * group with 2+ members gets a shared cardFamilyId: adopted from a member
 * that already has one, or minted fresh otherwise.
 *
 * KNOWN LIMITATION — read before trusting this in production: name +
 * artist + Pokédex number cannot reliably distinguish "same species,
 * different official artwork" (which should NOT be one family — e.g. two
 * unrelated Charizard cards illustrated by the same artist for different
 * sets) from a genuine reprint or language variant (which should). Groups
 * this script forms are a starting point, not ground truth — spot-check a
 * sample before relying on the resulting Language Variants / Reprints
 * panels, and use the admin card-family editor on the card detail page
 * (src/app/api/admin/card-family/route.ts) to correct mistakes or link
 * rows this heuristic missed (e.g. a reprint whose artist credit differs).
 *
 * Rows that already carry two DIFFERENT non-null cardFamilyIds within the
 * same computed group are left alone and logged as a conflict — this
 * script never merges two already-established families on its own, since
 * that's exactly the kind of judgment call the admin UI exists for.
 *
 * Safe to re-run: only writes a row whose cardFamilyId would actually
 * change.
 *
 * Run with: npx tsx scripts/backfill-catalog-family.ts [--dry-run]
 */
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining accents (post-NFKD)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const items = await db.catalogItem.findMany({
    where: { gameId: "pokemon" },
    select: { id: true, name: true, nameEn: true, artist: true, nationalPokedexNumbers: true, cardFamilyId: true },
  });

  const groups = new Map<
    string,
    { id: string; cardFamilyId: string | null }[]
  >();
  for (const item of items) {
    const key = [
      normalizeName(item.nameEn ?? item.name),
      [...item.nationalPokedexNumbers].sort((a, b) => a - b).join(","),
      item.artist ?? "",
    ].join("|");
    const list = groups.get(key) ?? [];
    list.push({ id: item.id, cardFamilyId: item.cardFamilyId });
    groups.set(key, list);
  }

  let assigned = 0;
  let alreadySet = 0;
  let conflicts = 0;
  let singletons = 0;

  for (const members of groups.values()) {
    if (members.length < 2) {
      singletons += 1;
      continue;
    }

    const existingIds = new Set(members.map((m) => m.cardFamilyId).filter((id): id is string => !!id));
    if (existingIds.size > 1) {
      conflicts += 1;
      console.warn(
        `Conflict: group of ${members.length} rows already carries ${existingIds.size} different cardFamilyIds — ` +
          `left unchanged (ids: ${members.map((m) => m.id).join(", ")})`
      );
      continue;
    }

    const familyId = existingIds.size === 1 ? [...existingIds][0] : randomUUID();
    for (const member of members) {
      if (member.cardFamilyId === familyId) {
        alreadySet += 1;
        continue;
      }
      if (!dryRun) await db.catalogItem.update({ where: { id: member.id }, data: { cardFamilyId: familyId } });
      assigned += 1;
    }
  }

  console.log(`${dryRun ? "[dry run] " : ""}Pokémon rows scanned: ${items.length}`);
  console.log(`Groups with 2+ members: ${groups.size - singletons}`);
  console.log(`Rows assigned a cardFamilyId: ${assigned}`);
  console.log(`Rows already correct: ${alreadySet}`);
  console.log(`Conflicting groups skipped: ${conflicts}`);
  if (!dryRun) {
    console.log(
      'Reminder: this script cannot call revalidateTag("catalog-card") from ' +
        "outside a Next.js request — the deployed app's 24h revalidate: 86400 " +
        "will pick these up eventually, or hit an admin revalidate route if one " +
        "is added for this tag (see src/app/api/admin/revalidate-facets/route.ts " +
        "for the pattern)."
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
