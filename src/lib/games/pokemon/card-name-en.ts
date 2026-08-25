// Relative, not "@/..." — the translation tables live under scripts/data/
// (alongside scripts/data/pokemon-set-translations.ts, which mapper.ts
// imports the same way), outside the "@/*" -> "./src/*" alias's reach.
import { POKEMON_SPECIES_NAMES } from "../../../../scripts/data/pokemon-species-names";
import {
  POKEMON_CARD_TRANSLATIONS,
  POKEMON_FORM_PREFIXES,
  POKEMON_TRAINER_POSSESSIVES,
} from "../../../../scripts/data/pokemon-card-translations";

/**
 * Resolves the English name of a non-English Pokémon card from its printed
 * localized name — CatalogItem.nameEn's data source.
 *
 * There is no id or number join available for this: tcgdex's Japanese /
 * Chinese / Korean catalogs are region-exclusive sets with their own
 * numbering (JP "SV3-139" is Charizard ex; EN "sv03-139" is Salandit), so
 * the name itself is the only thing the two sides share.
 *
 * Returns `undefined` — never a guess — when the name can't be resolved
 * with confidence, matching CatalogItem.nameEn's documented "English
 * counterpart hasn't been identified yet" convention. Trainer, Item,
 * Stadium and Tool cards have no species to key off and resolve only via
 * the curated table in scripts/data/pokemon-card-translations.ts.
 */

/**
 * Suffixes that ride on the end of a Pokémon card's name. `english` is the
 * exact form the English printings use — verified against the English rows
 * already in this catalog, which are genuinely inconsistent about it:
 * "Charizard ex" and "Charizard V" take a space, "Charizard-EX" and
 * "Charizard-GX" take a hyphen. Ordered longest-token-first so "VMAX" is
 * never mistaken for a bare "V".
 */
const SUFFIXES: { token: string; english: string }[] = [
  { token: "V-UNION", english: " V-UNION" },
  { token: "VSTAR", english: " VSTAR" },
  { token: "VMAX", english: " VMAX" },
  { token: "LV.X", english: " LV.X" },
  { token: "GX", english: "-GX" },
  { token: "EX", english: "-EX" },
  { token: "ex", english: " ex" },
  { token: "V", english: " V" },
  { token: "δ", english: " δ" },
  { token: "★", english: " ★" },
  { token: "☆", english: " ★" },
];

/** Possessive particles per language — "ペパーのマフィティフ", "火箭隊的火焰鳥", "마리의 나쁘뱀". */
const POSSESSIVE_PARTICLES: Record<string, string[]> = {
  JP: ["の"],
  CN: ["的"],
  TW: ["的"],
  KR: ["의 ", "의"],
};

/**
 * "<localized species> -> <English species>" per language, built once from
 * the generated index-aligned tables. Lazy so importing this module stays
 * cheap for the English-only code paths that never call the resolver.
 */
const speciesCache = new Map<string, Map<string, string>>();

function speciesLookup(language: string): Map<string, string> | undefined {
  const cached = speciesCache.get(language);
  if (cached) return cached;

  const localized = POKEMON_SPECIES_NAMES[language];
  const english = POKEMON_SPECIES_NAMES.EN;
  if (!localized || !english) return undefined;

  const map = new Map<string, string>();
  localized.forEach((name, i) => {
    // First entry wins — a localized name shared by two species (none today,
    // but the upstream table is regenerated) keeps the lower Dex number
    // rather than silently flipping between runs.
    if (!map.has(name)) map.set(name, english[i]);
  });
  speciesCache.set(language, map);
  return map;
}

/**
 * Case-insensitive "<English species name, lowercased> -> <correctly-cased
 * English species name>". A small but real slice of tcgdex's non-English
 * data is itself an untranslated/mis-cased English name (e.g. some very old
 * JP promos come back from the API as "slowpoke", "Zubat") rather than the
 * actual localized text — this recognizes those without a false-positive
 * risk, since it only ever fires when the name already IS an English
 * species name.
 */
let englishLowerCache: Map<string, string> | undefined;
function englishSpeciesLookup(): Map<string, string> {
  if (!englishLowerCache) {
    englishLowerCache = new Map(POKEMON_SPECIES_NAMES.EN.map((n) => [n.toLowerCase(), n]));
  }
  return englishLowerCache;
}

/** Strips every trailing suffix token, returning the bare name plus the English suffixes in printed order. */
function splitSuffixes(name: string): { base: string; suffix: string } {
  let base = name.trim();
  const parts: string[] = [];
  for (;;) {
    const match = SUFFIXES.find((s) => base.endsWith(s.token) && base.length > s.token.length);
    if (!match) break;
    parts.unshift(match.english);
    base = base.slice(0, -match.token.length).trim();
  }
  return { base, suffix: parts.join("") };
}

// tcgdex's "zh-cn" (Simplified) card text is, in practice, inconsistently
// simplified — a real chunk of it prints in Traditional characters instead
// (verified against the live catalog: ~4700 of the catalog's 1023 "CN" rows
// share byte-identical printed text with a "TW" row). Falling back to the
// Traditional species table for CN-language lookups only widens what
// resolves; it can't cause a false match, since a species name that happens
// to collide across scripts still names the same species. Shared by every
// species.get() call in resolveSpecies — including the one inside the
// regional-form-prefix loop, where a CN card can pair a Simplified prefix
// with a Traditionally-spelled species ("帕底亞 肯泰羅" — Simplified would be
// "肯泰罗").
function speciesGet(species: Map<string, string>, name: string, language: string): string | undefined {
  const direct = species.get(name);
  if (direct) return direct;
  if (language === "CN") return speciesLookup("TW")?.get(name);
  return undefined;
}

/** Resolves a species name, optionally carrying a regional-form/Mega prefix ("アローラ" + "ナッシー"). */
function resolveSpecies(base: string, language: string): string | undefined {
  const species = speciesLookup(language);
  if (!species) return undefined;

  const direct = speciesGet(species, base, language);
  if (direct) return direct;

  const englishFallback = englishSpeciesLookup().get(base.toLowerCase());
  if (englishFallback) return englishFallback;

  for (const [key, english] of Object.entries(POKEMON_FORM_PREFIXES)) {
    const [prefixLanguage, prefix] = splitKey(key);
    if (prefixLanguage !== language || !base.startsWith(prefix)) continue;
    // Chinese printings space the adjective off from the species
    // ("帕底亞 肯泰羅"); Japanese and Korean run them together.
    const rest = speciesGet(species, base.slice(prefix.length).trim(), language);
    if (rest) return `${english} ${rest}`;
  }
  return undefined;
}

/** "JP:アローラ" -> ["JP", "アローラ"] — the language code never contains ':'. */
function splitKey(key: string): [string, string] {
  const idx = key.indexOf(":");
  return [key.slice(0, idx), key.slice(idx + 1)];
}

/**
 * Trainer-owned Pokémon: "<owner><particle><species>" -> "Owner's Species".
 * Only resolves when the owner is in the curated list — see that table's
 * comment for why a bare-species fallback is worse than no answer.
 */
function resolvePossessive(base: string, language: string): string | undefined {
  // Chinese printings bracket the owner: "<火箭隊的>火焰鳥".
  const unbracketed = base.replace(/^[<＜]([^>＞]+)[>＞]\s*/, "$1");

  for (const particle of POSSESSIVE_PARTICLES[language] ?? []) {
    const idx = unbracketed.indexOf(particle);
    if (idx <= 0) continue;
    const owner = POKEMON_TRAINER_POSSESSIVES[`${language}:${unbracketed.slice(0, idx)}`];
    if (!owner) continue;
    const species = resolveSpecies(unbracketed.slice(idx + particle.length).trim(), language);
    if (species) return `${owner}'s ${species}`;
  }
  return undefined;
}

/**
 * TAG TEAM and other multi-Pokémon cards — "イーブイ&カビゴンGX" ->
 * "Eevee & Snorlax-GX", matching the English printings' " & " spacing.
 */
function resolveCombo(base: string, language: string): string | undefined {
  const parts = base.split(/\s*[&＆]\s*/);
  if (parts.length < 2) return undefined;

  const resolved = parts.map((part) => resolveSpecies(part, language) ?? resolvePossessive(part, language));
  if (resolved.some((r) => !r)) return undefined;
  return resolved.join(" & ");
}

export function resolvePokemonCardNameEn(name: string, language: string): string | undefined {
  if (language === "EN") return undefined;

  // Checked against the raw name first (e.g. Basic Energy, which has no
  // suffix concept), then against the suffix-stripped base with the printed
  // suffix reattached — so one curated entry for e.g. an Ogerpon mask form
  // covers its "ex" printing without a separate entry per suffix.
  const rawOverride = POKEMON_CARD_TRANSLATIONS[`${language}:${name}`];
  if (rawOverride) return rawOverride;

  const { base, suffix } = splitSuffixes(name);
  if (!base) return undefined;

  const baseOverride = POKEMON_CARD_TRANSLATIONS[`${language}:${base}`];
  if (baseOverride) return `${baseOverride}${suffix}`;

  const resolved =
    resolveSpecies(base, language) ??
    resolvePossessive(base, language) ??
    resolveCombo(base, language);

  return resolved ? `${resolved}${suffix}` : undefined;
}
