import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaClient as PrismaClientEdge } from ".prisma/client-edge";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Cloudflare Workers self-identifies via this documented navigator.userAgent
// value (developers.cloudflare.com/workers/runtime-apis/web-standards/).
// Workers can't open raw TCP sockets or load native/WASM query-engine
// binaries, and Prisma's default engine type ("library") still tries to
// lazily load one even when a driver adapter is passed to
// `new PrismaClient({ adapter })`. So Workers uses a second Prisma Client
// generated with engineType = "client" (see schema.prisma's `client_edge`
// generator) — Prisma's fully engine-less mode — via the PrismaNeon
// HTTP/WebSocket adapter. That mode mandates an adapter always, which is
// exactly why it's a separate client rather than the default: everywhere
// else (local dev, Vercel) keeps using the default client's built-in
// engine/TCP connection unmodified, same as before this file added Workers
// support. Do not import `pg`/`@prisma/adapter-pg` here for that non-Workers
// path — esbuild bundles whatever this file imports into the single Worker
// output regardless of which branch runs, and pg's optional pg-cloudflare
// native-socket shim fails to resolve, breaking the Workers build
// (confirmed: `Could not resolve "pg-cloudflare"` from opennextjs-cloudflare
// build when this was tried).
const isCloudflareWorkers =
  typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

function createPrismaClient() {
  const log: Prisma.LogLevel[] =
    process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"];
  if (isCloudflareWorkers) {
    const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
    // Structurally identical to the default client's type (same schema) —
    // cast so the rest of the app can keep using the default client's type.
    return new PrismaClientEdge({ adapter, log }) as unknown as PrismaClient;
  }
  return new PrismaClient({ log });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
