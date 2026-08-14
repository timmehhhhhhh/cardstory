import { COMMON_DISTRIBUTORS } from "@/lib/sportscards/distributors";

/**
 * Best-effort parsing of SportsCardsPro's free-text product/console names
 * into structured fields to prefill the Add Sports Card form. Never
 * authoritative — the user can edit every field before saving, since a
 * product name like "Michael Jordan #57 [Refractor]" doesn't cleanly map
 * to our schema in every case.
 */
export interface ParsedProductName {
  playerName: string;
  cardNumber: string | null;
  parallelName: string | null;
}

export function parseProductName(productName: string): ParsedProductName {
  // Parallel is often trailing in [Brackets] or after a trailing dash.
  const bracketMatch = productName.match(/\[(.+?)\]\s*$/);
  const parallelName = bracketMatch?.[1]?.trim() || null;
  const withoutParallel = bracketMatch ? productName.slice(0, bracketMatch.index).trim() : productName;

  const numberMatch = withoutParallel.match(/#(\S+)/);
  const cardNumber = numberMatch?.[1] ?? null;
  const playerName = withoutParallel.replace(/#\S+/, "").trim();

  return { playerName: playerName || withoutParallel, cardNumber, parallelName };
}

export interface ParsedConsoleName {
  year: number | null;
  distributor: string | null;
  setName: string;
}

/**
 * SportsCardsPro's console-name field isn't a fixed format across sports
 * (seen: "Basketball Cards 1986 Fleer", but real-world product names are
 * often written "2023 Panini Prizm Basketball" too) — this strips out
 * whatever year/distributor/category tokens it can confidently find and
 * leaves the rest as the set name, always user-editable afterward.
 */
export function parseConsoleName(consoleName: string): ParsedConsoleName {
  const yearMatch = consoleName.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? Number(yearMatch[0]) : null;

  const distributor =
    COMMON_DISTRIBUTORS.find((d) => new RegExp(`\\b${d}\\b`, "i").test(consoleName)) ?? null;

  let setName = consoleName;
  if (yearMatch) setName = setName.replace(yearMatch[0], "");
  if (distributor) setName = setName.replace(new RegExp(`\\b${distributor}\\b`, "i"), "");
  setName = setName.replace(/\bcards\b/i, "").replace(/\s+/g, " ").trim();

  return { year, distributor, setName: setName || consoleName };
}
