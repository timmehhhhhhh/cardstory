/**
 * Reading and writing the derived mapping files under scripts/data/, plus the
 * `verified` gate that stands between a crawl and the database.
 *
 * The gate is the load-bearing part. Crawlers only ever write
 * `verified: false`; a human flips it after reading the derive summary and
 * spot-checking rows against the live source; and every consumer refuses a
 * file that hasn't been flipped. That check was previously copy-pasted into
 * three consumers (backfill-set-logo-url, backfill-set-name-en,
 * seed-card-images), which is exactly the kind of thing that rots silently —
 * a fourth consumer that forgets it would push unreviewed scraped data
 * straight into the catalog.
 *
 * See scripts/data/card-images/types.ts for the convention's full rationale.
 */
import * as fs from "node:fs";
import * as path from "node:path";

/** Anything written by a crawler as its main (seedable) output. */
export interface VerifiableFile {
  verified: boolean;
  sourceNote: string;
}

export function dataDir(...segments: string[]): string {
  return path.join(process.cwd(), "scripts", "data", ...segments);
}

/**
 * Loads a crawler output file only if it exists AND has been marked verified.
 * Returns null (with a consistent log line) otherwise, so callers can treat
 * "not there yet" and "not reviewed yet" the same way: contribute nothing.
 *
 * Deliberately not a throw. A backfill that runs across many source files
 * should still apply the reviewed ones rather than abort on the first
 * unreviewed one.
 */
export function loadVerified<T extends VerifiableFile>(dir: string, name: string): T | null {
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) return null;
  const parsed = JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  if (!parsed.verified) {
    console.log(`- ${name}: not verified yet, skipping (see its header comment).`);
    return null;
  }
  return parsed;
}

/**
 * Writes a derived file. `verified` is forced to false and cannot be passed
 * in: nothing machine-generated may mark itself reviewed.
 */
export function writeMappingFile<T extends object>(
  dir: string,
  name: string,
  payload: Omit<T, "verified" | "generatedAt">
): void {
  fs.mkdirSync(dir, { recursive: true });
  const out = { ...payload, verified: false, generatedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(dir, name), JSON.stringify(out, null, 2));
}

/** Review files carry no `verified` flag — nothing ever seeds them. */
export function writeReviewFile<T extends object>(
  dir: string,
  name: string,
  payload: Omit<T, "generatedAt">
): void {
  fs.mkdirSync(dir, { recursive: true });
  const out = { ...payload, generatedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(dir, name), JSON.stringify(out, null, 2));
}

export function tallyByReason(entries: { reason: string }[]): Record<string, number> {
  return entries.reduce<Record<string, number>>((acc, r) => {
    acc[r.reason] = (acc[r.reason] ?? 0) + 1;
    return acc;
  }, {});
}

export interface DeriveSummary {
  /** Rows that passed every guard and are in the main output file. */
  mapped: number;
  /** Rows whose target already had a value; left untouched. */
  alreadyPopulated: number;
  reviewed: { reason: string }[];
  /** Filename quoted in the closing "review, then flip it" line. */
  outName: string;
  /** Label for the alreadyPopulated line, which differs per target field. */
  alreadyLabel?: string;
  /** Appended in parentheses to the Mapped line, e.g. "3 via the secondary EN-name guard". */
  mappedSuffix?: string;
  /** Extra lines printed between "Had art" and "Review", for source-specific counters. */
  extraLines?: string[];
}

/**
 * The closing summary of a derive run. This is the artefact a human actually
 * reads before deciding whether to flip `verified`, so it stays terse and
 * always reports the same three numbers in the same order.
 */
export function printDeriveSummary(s: DeriveSummary): void {
  console.log(`\nMapped:   ${s.mapped}${s.mappedSuffix ? ` (${s.mappedSuffix})` : ""}`);
  console.log(`Had art:  ${s.alreadyPopulated} (${s.alreadyLabel ?? "already sourced from the provider — untouched"})`);
  for (const line of s.extraLines ?? []) console.log(line);
  console.log(`Review:   ${s.reviewed.length}`, tallyByReason(s.reviewed));
  console.log(`\nWrote ${s.outName} (verified: false — review, then flip it).`);
}
