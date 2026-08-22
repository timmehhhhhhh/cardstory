// Cloudflare Workers deployment config for @opennextjs/cloudflare — see
// AGENTS.md's pointer to node_modules/next/dist/docs/ and Cloudflare's
// Next.js-on-Workers guide (developers.cloudflare.com/workers/frameworks/
// framework-guides/nextjs/) for the current adapter contract. Consumed by
// the "preview"/"deploy" scripts in package.json and by Cloudflare's
// "Workers Builds" git-integrated CI/CD (the "Workers Builds: cardstory"
// GitHub check) — Vercel remains the primary deployment target (see
// vercel.json's cron config); this is additive, not a replacement.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
