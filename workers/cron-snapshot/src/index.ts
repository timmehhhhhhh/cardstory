export interface Env {
  TARGET_URL: string;
  CRON_SECRET: string;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      fetch(env.TARGET_URL, {
        method: "POST",
        headers: { authorization: `Bearer ${env.CRON_SECRET}` },
      }).then(async (res) => {
        if (!res.ok) {
          throw new Error(`snapshot-prices returned ${res.status}: ${await res.text()}`);
        }
      })
    );
  },
};
