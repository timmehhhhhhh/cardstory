/**
 * Append-only JSONL log of everything a crawl fetched, one line per id.
 *
 * The point of keeping this separate from the derived mapping files under
 * scripts/data/card-images/ is that the crawl is the expensive part (~30h for
 * the JP id space) and the mapping is the part most likely to be wrong — set
 * aliases, number padding, name-normalization. Caching raw results means every
 * later fix re-derives at zero additional requests instead of re-crawling.
 *
 * Also makes the crawl resumable: it is going to be interrupted.
 * Lives under scripts/.cache/, which is gitignored.
 */
import * as fs from "node:fs";
import * as path from "node:path";

// npm scripts always run from the package root, so cwd is stable here and
// this avoids depending on __dirname/import.meta resolving under tsx.
const CACHE_DIR = path.join(process.cwd(), "scripts", ".cache");

export interface CrawlRecord {
  /** The source site's internal card id that was fetched. */
  id: number;
  status: number;
  [key: string]: unknown;
}

export interface CrawlCache<T extends CrawlRecord> {
  /** Ids already fetched — skip these to resume. */
  seen: Set<number>;
  append(record: T): void;
  all(): T[];
  close(): void;
}

export function openCrawlCache<T extends CrawlRecord>(name: string): CrawlCache<T> {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const file = path.join(CACHE_DIR, `${name}.jsonl`);

  // Keyed by id so a re-fetch supersedes the earlier record rather than
  // duplicating it. A Map (not findIndex over an array) because this file
  // reaches ~60k lines for the JP sweep.
  const byId = new Map<number, T>();
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf-8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const rec = JSON.parse(line) as T;
        byId.set(rec.id, rec);
      } catch {
        // A torn last line from a Ctrl-C mid-write is expected; skip it.
      }
    }
  }
  const seen = new Set<number>(byId.keys());

  const handle = fs.openSync(file, "a");

  return {
    seen,
    append(record: T) {
      fs.writeSync(handle, JSON.stringify(record) + "\n");
      seen.add(record.id);
      byId.set(record.id, record);
    },
    all: () => [...byId.values()],
    close: () => fs.closeSync(handle),
  };
}
