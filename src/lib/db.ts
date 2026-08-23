import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaClient as PrismaClientWasm } from "@prisma/client/wasm.js";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Cloudflare Workers self-identifies via this documented navigator.userAgent
// value (developers.cloudflare.com/workers/runtime-apis/web-standards/).
// Workers can't open raw TCP sockets or load a native query-engine binary, so
// it needs Prisma's WASM build plus a Neon adapter.
//
// We specifically use PrismaNeonHTTP (issues one plain `fetch()` per query)
// rather than the WebSocket-pool `PrismaNeon` adapter. `db` below is a
// module-level singleton, reused across every request handled by a warm
// isolate. A WS pool lazily opens its socket during whichever request first
// runs a query, and Workers forbids reusing that socket (an I/O handle) from
// any other request's handler — subsequent requests on the same isolate throw
// "Cannot perform I/O on behalf of a different request" (Cloudflare Error
// 1101), intermittently, depending on isolate reuse. The HTTP adapter has no
// persistent socket to violate that rule, since it just calls global fetch()
// fresh per query. (Neither adapter supports interactive `$transaction`s over
// HTTP, but this codebase doesn't use them.)
//
// The import above must point at the WASM build's concrete file, not bare
// "@prisma/client". The bare specifier picks a build via export conditions,
// and opennextjs-cloudflare's esbuild pass runs with BOTH `platform: "node"`
// (which implies the "node" condition) and `conditions: ["workerd"]`. Export
// maps match in declaration order and Prisma lists "node" first, so the bare
// import silently resolves to the Node build — which then tries to fs-read the
// engine and dies at runtime with `no such file or directory, readAll
// '.../query_engine_bg.wasm'`. The ".js" suffix matters: the package's
// conditional "./wasm" export maps ESM imports to a wasm.mjs that Prisma does
// not actually ship, so it fails to resolve — while the package's "./*": "./*"
// catch-all resolves the concrete wasm.js unconditionally. From there
// opennextjs-cloudflare's
// setWranglerExternal() plugin marks the .wasm external with an absolute path
// and wrangler bundles it as a CompiledWasm module.
//
// Do not import `pg`/`@prisma/adapter-pg` here for the non-Workers path —
// esbuild bundles whatever this file imports into the single Worker output
// regardless of which branch runs, and pg's optional pg-cloudflare
// native-socket shim fails to resolve, breaking the Workers build (confirmed:
// `Could not resolve "pg-cloudflare"` from opennextjs-cloudflare build).
const isCloudflareWorkers =
  typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

function createPrismaClient() {
  const log: Prisma.LogLevel[] =
    process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"];
  if (isCloudflareWorkers) {
    const adapter = new PrismaNeonHTTP(process.env.DATABASE_URL!, {});
    // Same schema, so structurally identical to the default client's type —
    // cast so the rest of the app keeps using the default client's type.
    return new PrismaClientWasm({ adapter, log }) as unknown as PrismaClient;
  }
  return new PrismaClient({ log });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
