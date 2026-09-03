/**
 * Argument parsing and the process-exit footer shared by the data scripts.
 *
 * Every crawler and backfill previously carried its own copy of one or both:
 * four separate `--name=value` readers (`numArg` in the ja crawler, an inline
 * `--sets=` reader repeated verbatim in three crawlers, `argValue` in
 * review-image-candidates) and a `main().catch(...)` footer that was written
 * two different ways.
 */

/** Reads `--name=value`. Returns undefined when the flag is absent. */
export function argValue(name: string): string | undefined {
  const raw = process.argv.find((a) => a.startsWith(`--${name}=`));
  return raw?.slice(name.length + 3);
}

/** Reads `--name=N`, falling back when absent or not a finite number. */
export function argNumber(name: string, fallback: number): number {
  const raw = argValue(name);
  const n = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Reads `--name=a,b,c`. Returns undefined when absent, so "not specified" stays distinguishable from "specified empty". */
export function argList(name: string): string[] | undefined {
  const raw = argValue(name);
  return raw === undefined ? undefined : raw.split(",").filter(Boolean);
}

export function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

/** The verb, e.g. `crawl` in `tsx scripts/crawl-foo.ts crawl --sets=A,B`. */
export function verb(): string | undefined {
  return process.argv[2];
}

/**
 * Runs a script's main() and disconnects Prisma exactly once, whatever
 * happened.
 *
 * Sets `process.exitCode` rather than calling `process.exit(1)`: the scripts
 * that called `process.exit` could truncate their own final console output,
 * which for a crawler is the summary the human needs in order to decide
 * whether to flip `verified`. Setting the code lets node flush and exit on
 * its own.
 */
export async function runScript(main: () => Promise<void>, disconnect: () => Promise<unknown>): Promise<void> {
  try {
    await main();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await disconnect();
  }
}

/** Prints usage and marks the run failed. Use for an unrecognised verb. */
export function usage(line: string): void {
  console.error(line);
  process.exitCode = 1;
}
