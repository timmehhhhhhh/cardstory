import Fuse, { type IFuseOptions } from "fuse.js";
import type { QuickImportSetOption } from "@/app/api/quick-import/sets/route";

export interface SetMatchCandidate {
  id: string;
  name: string;
  /** Fuse's own distance score — 0 is a perfect match, larger is worse. */
  score: number;
}

const FUSE_OPTIONS: IFuseOptions<QuickImportSetOption> = {
  keys: [
    { name: "name", weight: 1 },
    { name: "nameEn", weight: 1 },
  ],
  threshold: 0.45,
  ignoreLocation: true,
  includeScore: true,
};

/**
 * Fuzzy-matches a dictated set-name fragment (e.g. "fossil" or "wizards
 * black star promo") against one game's sets, ranked best first. Client-side
 * only — the sets list for a game is small and fetched once per game via
 * /api/quick-import/sets, so there's no need for a DB-side fuzzy index.
 */
export function rankSetCandidates(query: string, sets: QuickImportSetOption[]): SetMatchCandidate[] {
  const trimmed = query.trim();
  if (!trimmed || sets.length === 0) return [];
  const fuse = new Fuse(sets, FUSE_OPTIONS);
  return fuse
    .search(trimmed)
    .map((r) => ({ id: r.item.id, name: r.item.name, score: r.score ?? 1 }))
    .sort((a, b) => a.score - b.score);
}

/**
 * Whether the top-ranked candidate is confident enough to skip straight to
 * results without showing the set-picker step — true for a near-exact match,
 * or a clear leader well ahead of the runner-up. Dictation of a set name is
 * inherently noisy (garbled words, dropped articles), so this stays
 * conservative: a close call falls through to the picker rather than
 * silently searching the wrong set.
 */
export function isConfidentMatch(candidates: SetMatchCandidate[]): boolean {
  if (candidates.length === 0) return false;
  const [top, runnerUp] = candidates;
  if (top.score <= 0.05) return true;
  if (!runnerUp) return top.score <= 0.35;
  return top.score <= 0.35 && runnerUp.score - top.score >= 0.2;
}
