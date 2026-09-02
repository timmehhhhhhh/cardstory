export interface Env {
  TARGET_BASE_URL: string;
  CRON_SECRET: string;
}

/** Maps each cron expression configured in wrangler.jsonc to the main site's API route it should fire. */
const ROUTE_BY_CRON: Record<string, string> = {
  "0 3 * * *": "/api/cron/pokemon-catalog-sync",
  "15 3 * * *": "/api/cron/pokemon-image-backfill",
  "30 3 * * *": "/api/cron/pokemon-set-logo-backfill",
  "45 3 * * *": "/api/cron/pokemon-name-en-backfill",
  "0 4 * * 7": "/api/cron/sports-image-backfill",
};

export default {
  async fetch(): Promise<Response> {
    return new Response(
      "cardstory-cron-image-automation: no HTTP API here, this Worker only runs on a schedule.",
      { status: 200 }
    );
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const path = ROUTE_BY_CRON[event.cron];
    if (!path) {
      console.error(`No route configured for cron expression "${event.cron}" — check wrangler.jsonc/ROUTE_BY_CRON are in sync.`);
      return;
    }

    ctx.waitUntil(
      fetch(`${env.TARGET_BASE_URL}${path}`, {
        method: "POST",
        headers: { authorization: `Bearer ${env.CRON_SECRET}` },
      }).then(async (res) => {
        if (!res.ok) {
          throw new Error(`${path} returned ${res.status}: ${await res.text()}`);
        }
      })
    );
  },
};
