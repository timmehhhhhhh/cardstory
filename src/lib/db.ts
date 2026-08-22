import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Cloudflare Workers self-identifies via this documented navigator.userAgent
// value (developers.cloudflare.com/workers/runtime-apis/web-standards/).
// Workers can't open raw TCP sockets or load native query-engine binaries,
// so it needs the Neon HTTP/WebSocket driver adapter there. `@prisma/client`
// must NOT import `pg`/`@prisma/adapter-pg` anywhere in this file — esbuild
// bundles that into the Worker too (there's only one code path, chosen at
// runtime) and `pg`'s optional `pg-cloudflare` native-socket shim fails to
// resolve, breaking the Workers build. So everywhere else (local dev,
// Vercel) just keeps using Prisma's default engine/TCP connection, same as
// before this file added Workers support.
const isCloudflareWorkers =
  typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

function createPrismaClient() {
  const log: Prisma.LogLevel[] =
    process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"];
  if (isCloudflareWorkers) {
    const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
    return new PrismaClient({ adapter, log });
  }
  return new PrismaClient({ log });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
