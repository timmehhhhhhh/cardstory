/**
 * A small key/value JSON side-cache under scripts/.cache/, for the lookup
 * tables a crawl builds once and then reuses on every later run.
 *
 * Distinct from lib/crawl-cache.ts, and both exist on purpose:
 *   - crawl-cache is an append-only JSONL log keyed by the source's numeric
 *     id, sized for ~60k rows and written a line at a time so a Ctrl-C mid
 *     sweep loses at most one record.
 *   - this is a whole-file JSON map, rewritten atomically, for the small
 *     ancillary indexes (a few hundred entries) a crawl needs before it can
 *     start — pokellector's set-code -> slug index, bulbapedia's page index
 *     and its filename -> CDN-URL resolutions.
 *
 * Both of those previously hand-rolled the same
 * `existsSync ? JSON.parse(readFileSync) : {}` / mutate / `writeFileSync`
 * dance. Names are passed through verbatim so existing cache files on disk
 * keep working — do not rename them without deleting the old file.
 */
import * as fs from "node:fs";
import * as path from "node:path";

// npm scripts always run from the package root, so cwd is stable here. Same
// reasoning as lib/crawl-cache.ts — see its comment.
const CACHE_DIR = path.join(process.cwd(), "scripts", ".cache");

export interface JsonCache<T> {
  /** The backing map. Safe to read directly; mutate via set() so it gets saved. */
  data: Record<string, T>;
  has(key: string): boolean;
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  /** Writes the whole map back. Call once at the end of a stage, not per key. */
  save(): void;
}

export function openJsonCache<T>(name: string): JsonCache<T> {
  const file = path.join(CACHE_DIR, `${name}.json`);
  let data: Record<string, T> = {};
  if (fs.existsSync(file)) {
    try {
      data = JSON.parse(fs.readFileSync(file, "utf-8")) as Record<string, T>;
    } catch {
      // A truncated cache is a cache miss, not a crash: the whole point of
      // these files is that they can always be rebuilt from the source.
      console.warn(`- ${name}.json is unreadable, starting from empty.`);
      data = {};
    }
  }

  return {
    data,
    has: (key) => key in data,
    get: (key) => data[key],
    set: (key, value) => {
      data[key] = value;
    },
    save() {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      // Write-then-rename so an interrupted save can't leave a half-written
      // file where a valid one used to be.
      const tmp = `${file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
      fs.renameSync(tmp, file);
    },
  };
}
