/**
 * Speech recognition often transcribes a spoken card number under ~20 as its
 * English word rather than digits (e.g. "fossil eight" instead of "fossil
 * 8"), which breaks parseNameNumberQuery's `/\d/.test(tail)` check (see
 * src/lib/utils/name-match.ts) and surfaces as "no number heard" in Quick
 * Import's dictate step. This runs *before* that parse, replacing whole
 * number-words with their digit form so the rest of the pipeline sees a
 * normal "<name> <digits>" query. Scoped to Quick Import only — the shared
 * parseNameNumberQuery is also used by typed-text search
 * (card-picker-sheet.tsx, smart-filters.tsx) where a literal word like
 * "eight" in a query is never meant as a number.
 */
const NUMBER_WORDS: Record<string, string> = {
  zero: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
  eleven: "11",
  twelve: "12",
  thirteen: "13",
  fourteen: "14",
  fifteen: "15",
  sixteen: "16",
  seventeen: "17",
  eighteen: "18",
  nineteen: "19",
  twenty: "20",
};

const NUMBER_WORD_PATTERN = new RegExp(`\\b(${Object.keys(NUMBER_WORDS).join("|")})\\b`, "gi");

export function normalizeSpokenNumbers(q: string): string {
  return q.replace(NUMBER_WORD_PATTERN, (match) => NUMBER_WORDS[match.toLowerCase()]);
}
