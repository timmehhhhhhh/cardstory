/**
 * Operational health check — run this any time to confirm CardStory's
 * required services are actually configured and reachable, and get
 * step-by-step guidance for whatever isn't.
 *
 * Checks against whatever `.env`/`.env.local` (or exported shell env vars)
 * are in scope when you run it — point `NEXT_PUBLIC_APP_URL` at production
 * to check the live site, or leave it unset/localhost to check local dev.
 *
 * Run with: npm run health-check
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type Status = "ok" | "warn" | "fail" | "info";

const ICON: Record<Status, string> = { ok: "✅", warn: "⚠️ ", fail: "❌", info: "ℹ️ " };
let failCount = 0;
let warnCount = 0;

function report(name: string, status: Status, detail: string, fix?: string) {
  if (status === "fail") failCount++;
  if (status === "warn") warnCount++;
  console.log(`${ICON[status]} ${name} — ${detail}`);
  if (fix) console.log(`   → ${fix.replace(/\n/g, "\n   ")}`);
}

// ---------------------------------------------------------------------------
// Load env vars the same way Next.js does: .env.local wins over .env. Both
// are optional — if neither exists (e.g. running against exported prod
// secrets in CI), we just fall back to whatever's already in process.env.
// ---------------------------------------------------------------------------
function loadEnvFile(file: string) {
  const p = path.resolve(process.cwd(), file);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

// ---------------------------------------------------------------------------
// Required — app is broken without these.
// ---------------------------------------------------------------------------
function checkRequiredVar(name: string, fix: string) {
  const value = process.env[name];
  if (!value) {
    report(name, "fail", "not set", fix);
  } else {
    report(name, "ok", "set");
  }
}

async function checkDatabase() {
  if (!process.env.DATABASE_URL) {
    report(
      "Database connectivity",
      "info",
      "skipped — DATABASE_URL not set (see the check above)"
    );
    return;
  }
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    report("Database connectivity", "ok", "connected successfully");
  } catch (err) {
    report(
      "Database connectivity",
      "fail",
      `could not connect (${(err as Error).message.split("\n")[0]})`,
      "1. Check neon.tech console → your project isn't suspended/over quota (free tier auto-wakes on connect, but check anyway).\n" +
        "2. Double check DATABASE_URL/DIRECT_URL are the current Neon connection strings (they rotate if you reset a password).\n" +
        "3. Locally: confirm your local Postgres is running, if that's what .env.local points at."
    );
  }
}

async function checkPriceSnapshotFreshness() {
  if (!process.env.DATABASE_URL) {
    report("Price snapshot freshness", "info", "skipped — no DATABASE_URL");
    return;
  }
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    const latest = await prisma.priceSnapshot.findFirst({
      orderBy: { capturedDate: "desc" },
      select: { capturedDate: true },
    });
    await prisma.$disconnect();

    if (!latest) {
      report(
        "Price snapshot freshness",
        "info",
        "no snapshots yet",
        "Run `npm run seed:catalog` then `npm run snapshot:manual` to create the first one."
      );
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    if (latest.capturedDate === today || latest.capturedDate === yesterday) {
      report("Price snapshot freshness", "ok", `latest snapshot is ${latest.capturedDate}`);
    } else {
      report(
        "Price snapshot freshness",
        "warn",
        `latest snapshot is ${latest.capturedDate} — the daily cron job looks stalled`,
        "1. Cloudflare dashboard → Workers → cardstory-cron-snapshot → Triggers tab — check the last cron run succeeded (schedule: 0 6 * * * UTC).\n" +
          "2. Confirm CRON_SECRET is set and IDENTICAL on both the `cardstory` and `cardstory-cron-snapshot` Workers (Settings → Variables and Secrets on each).\n" +
          "3. If the cron worker itself is out of date, redeploy it: `npm run deploy:cron`.\n" +
          "4. To test the job logic directly (bypassing the cron trigger entirely): `npm run snapshot:manual`."
      );
    }
  } catch (err) {
    report(
      "Price snapshot freshness",
      "fail",
      `couldn't query — ${(err as Error).message.split("\n")[0]}`
    );
  }
}

async function checkSiteReachable() {
  const url = process.env.NEXT_PUBLIC_APP_URL || "https://cardstory.app";
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      report("Site reachable", "ok", `${url} responded ${res.status}`);
    } else {
      report(
        "Site reachable",
        "fail",
        `${url} responded ${res.status}`,
        "Cloudflare dashboard → Workers → cardstory → check the latest deployment's status and Logs tab for errors."
      );
    }
  } catch (err) {
    const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
    report(
      "Site reachable",
      "fail",
      `couldn't reach ${url} (${(err as Error).message.split("\n")[0]})`,
      isLocal
        ? "Start the dev server first: `npm run dev` (or set NEXT_PUBLIC_APP_URL to check production instead)."
        : "1. Check Cloudflare dashboard → Workers → cardstory — is the last deployment green?\n" +
            "2. Check the domain's DNS is still routed to the Worker (Cloudflare dashboard → your zone → DNS).\n" +
            "3. Redeploy if needed: `npm run deploy`."
    );
  }
}

async function checkCronEndpointGuarded() {
  const url = process.env.NEXT_PUBLIC_APP_URL || "https://cardstory.app";
  const endpoint = `${url.replace(/\/$/, "")}/api/cron/snapshot-prices`;
  try {
    // Deliberately sent WITHOUT an Authorization header — this should be
    // rejected with a 401 straight from the route handler. redirect:
    // "manual" is essential here: fetch() follows redirects by default, and
    // this route sits behind src/middleware.ts's auth gate, which redirects
    // *any* unauthenticated request (307, to /login) before the route's own
    // CRON_SECRET check ever runs. Following that redirect would land on
    // the login page (200 OK) and misreport an unprotected endpoint as
    // healthy — which is also exactly what breaks the real cron worker's
    // POST in production if /api/cron isn't excluded from the matcher.
    const res = await fetch(endpoint, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 401) {
      report("Cron endpoint deployed & guarded", "ok", "returns 401 without a valid secret, as expected");
    } else if (res.status >= 300 && res.status < 400) {
      report(
        "Cron endpoint deployed & guarded",
        "fail",
        `redirected (${res.status}) instead of returning 401 — src/middleware.ts's auth gate is intercepting this route before CRON_SECRET is ever checked`,
        "The Cloudflare cron worker's POST hits this same redirect and never reaches the route handler — the daily snapshot job is likely not running at all.\n" +
          "Fix: add /api/cron to the excluded paths in src/middleware.ts's `matcher` (alongside the existing api/auth, showcase, api/showcase exclusions), then redeploy with `npm run deploy`."
      );
    } else if (res.ok) {
      report(
        "Cron endpoint deployed & guarded",
        "fail",
        `responded ${res.status} with NO auth header — the endpoint is unprotected`,
        "CRON_SECRET is likely unset on the `cardstory` Worker (an unset secret makes isAuthorized() always return false, which — since you're seeing success — is NOT what's happening here). Check Settings → Variables and Secrets and re-set it if needed."
      );
    } else {
      report(
        "Cron endpoint deployed & guarded",
        "warn",
        `responded ${res.status} (expected 401)`
      );
    }
  } catch (err) {
    report(
      "Cron endpoint deployed & guarded",
      "fail",
      `couldn't reach ${endpoint} (${(err as Error).message.split("\n")[0]})`,
      "Site itself may be down — see the 'Site reachable' check above."
    );
  }
  report(
    "Cron secret parity (main site vs. cron worker)",
    "info",
    "not verifiable remotely from this script (secret values are write-only)",
    "If in doubt, re-set the same value on both:\n" +
      "  wrangler secret put CRON_SECRET\n" +
      "  wrangler secret put CRON_SECRET --config workers/cron-snapshot/wrangler.jsonc"
  );
}

function checkOptionalVar(name: string, feature: string) {
  if (process.env[name]) {
    report(name, "ok", `set — ${feature} is fully live`);
  } else {
    report(name, "info", `not set — ${feature} (optional, degrades gracefully)`);
  }
}

async function main() {
  console.log("CardStory health check\n" + "=".repeat(40));

  console.log("\n-- Required --");
  checkRequiredVar(
    "DATABASE_URL",
    "Set in .env.local (local dev) or as a Worker secret (production):\nwrangler secret put DATABASE_URL\nGet the pooled connection string from your neon.tech project."
  );
  checkRequiredVar(
    "DIRECT_URL",
    "Same as DATABASE_URL, but Neon's *unpooled* connection string — needed by Prisma Migrate.\nwrangler secret put DIRECT_URL"
  );
  checkRequiredVar(
    "AUTH_SECRET",
    "Generate one with `npx auth secret` and set it:\nwrangler secret put AUTH_SECRET\n(Rotating this logs everyone out — all existing sessions become invalid.)"
  );
  checkRequiredVar(
    "CRON_SECRET",
    "Generate one with `openssl rand -hex 32` and set the SAME value on BOTH Workers:\nwrangler secret put CRON_SECRET\nwrangler secret put CRON_SECRET --config workers/cron-snapshot/wrangler.jsonc"
  );

  await checkDatabase();
  await checkPriceSnapshotFreshness();
  await checkSiteReachable();
  await checkCronEndpointGuarded();

  console.log("\n-- Optional (features degrade gracefully if unset) --");
  checkOptionalVar("GEMINI_API_KEY", "the Scan feature's camera card-ID (falls back to manual search)");
  checkOptionalVar("PRICECHARTING_API_KEY", "the Graded Prices panel (paid, no free tier)");
  checkOptionalVar("SPORTSCARDSPRO_API_KEY", "sports card search/auto-match (paid; falls back to PRICECHARTING_API_KEY, then manual entry)");
  checkOptionalVar("POKEMONTCG_API_KEY", "a higher pokemontcg.io rate limit");

  console.log("\n" + "=".repeat(40));
  if (failCount > 0) {
    console.log(`❌ ${failCount} check(s) failed, ${warnCount} warning(s). See the guidance above.`);
    process.exitCode = 1;
  } else if (warnCount > 0) {
    console.log(`⚠️  All required checks passed, but ${warnCount} warning(s) — see above.`);
  } else {
    console.log("✅ Everything's healthy.");
  }
}

main().catch((err) => {
  console.error("Health check crashed:", err);
  process.exitCode = 1;
});
