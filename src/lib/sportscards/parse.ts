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
  setName: string;
}

export function parseConsoleName(consoleName: string): ParsedConsoleName {
  const yearMatch = consoleName.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? Number(yearMatch[0]) : null;
  return { year, setName: consoleName };
}
