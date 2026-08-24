/**
 * Sets have no dedicated `language` column — only Pokémon has non-English
 * sets, and those encode their language as a "<tcgdexLang>:<id>" prefix on
 * Set.code (e.g. "ja:sv10"), left bare ("sv10") for English sets — see
 * mapTcgdexSet/mapPokemonSet in lib/games/pokemon/mapper.ts and
 * TCGDEX_LANGUAGE_CODE for the raw tcgdex code -> app language code mapping.
 * Every other WIRED game (fab, riftbound, sports) is English-only and never
 * has a prefixed code, so it falls through to "EN" here too.
 */
const CODE_PREFIX_TO_LANGUAGE: Record<string, string> = {
  ja: "JP",
  "zh-cn": "CN",
  "zh-tw": "TW",
  ko: "KR",
};

export function languageFromSetCode(code: string | null | undefined): string {
  if (!code) return "EN";
  const idx = code.indexOf(":");
  if (idx === -1) return "EN";
  return CODE_PREFIX_TO_LANGUAGE[code.slice(0, idx)] ?? "EN";
}

/** Same code -> display-name mapping used by the language filters elsewhere (e.g. app/views/_components/view-builder.tsx). */
export const LANGUAGE_LABELS: Record<string, string> = {
  EN: "English",
  JP: "Japanese",
  CN: "Chinese (Simplified)",
  TW: "Chinese (Traditional)",
  KR: "Korean",
};

export function languageLabel(code: string): string {
  return LANGUAGE_LABELS[code] ?? code;
}
