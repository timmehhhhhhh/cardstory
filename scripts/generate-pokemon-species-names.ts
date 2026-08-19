/**
 * Regenerates scripts/data/pokemon-species-names.ts — the localized Pokémon
 * species-name table the English-name resolver keys off of (see
 * lib/games/pokemon/card-name-en.ts).
 *
 * Source: github.com/sindresorhus/pokemon's data/*.json — five index-aligned
 * arrays (index 0 is Bulbasaur / フシギダネ / 이상해씨 / 妙蛙種子 in every
 * file), one per language, covering all 1025 species. Chosen over PokéAPI
 * because PokéAPI's live deployment returns no zh-Hans/zh-Hant names at all,
 * and CN+TW is 9278 of our non-English rows.
 *
 * Run by hand when a new generation ships — never as part of a seed. The
 * generated file is committed so neither seed-catalog.ts nor
 * backfill-catalog-name-en.ts ever touches the network for this.
 *
 * Run with: npx tsx scripts/generate-pokemon-species-names.ts
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";

const REPO = "https://raw.githubusercontent.com/sindresorhus/pokemon/main/data";

/** upstream data file -> this app's CatalogItem.language code (see lib/pc/types.ts). */
const LANGUAGE_FILES: Record<string, string> = {
  EN: "en",
  JP: "ja",
  KR: "ko",
  CN: "zh-hans",
  TW: "zh-hant",
};

const OUT_PATH = path.join(process.cwd(), "scripts/data/pokemon-species-names.ts");

async function fetchNames(file: string): Promise<string[]> {
  const res = await fetch(`${REPO}/${file}.json`);
  if (!res.ok) throw new Error(`fetch failed (${res.status}) for ${file}.json`);
  return (await res.json()) as string[];
}

async function main() {
  const entries: [string, string[]][] = [];
  for (const [language, file] of Object.entries(LANGUAGE_FILES)) {
    entries.push([language, await fetchNames(file)]);
  }

  const lengths = new Set(entries.map(([, names]) => names.length));
  if (lengths.size !== 1) {
    throw new Error(`upstream arrays are not index-aligned: ${JSON.stringify(entries.map(([l, n]) => [l, n.length]))}`);
  }
  const count = entries[0][1].length;

  const body = entries
    .map(([language, names]) => `  ${language}: [\n${names.map((n) => `    ${JSON.stringify(n)},`).join("\n")}\n  ],`)
    .join("\n");

  const file = `/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npx tsx scripts/generate-pokemon-species-names.ts
 *
 * Localized Pokémon species names, index-aligned across every language
 * (index 0 is National Dex #1 in all of them), sourced from
 * github.com/sindresorhus/pokemon. ${count} species as of ${new Date().toISOString().slice(0, 10)}.
 *
 * Keyed by this app's CatalogItem.language codes. Consumed by
 * lib/games/pokemon/card-name-en.ts, which builds the reverse
 * "<localized name> -> English name" lookups from it.
 */
export const POKEMON_SPECIES_NAMES: Record<string, readonly string[]> = {
${body}
};
`;

  await writeFile(OUT_PATH, file, "utf8");
  console.log(`Wrote ${OUT_PATH} — ${count} species × ${entries.length} languages.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
