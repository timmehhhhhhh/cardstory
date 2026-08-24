import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Session } from "next-auth";

/**
 * Call at the top of every protected page.tsx (a Server Component) to
 * enforce "every route requires a signed-in account" per-page, rather than
 * with a single global gate.
 *
 * A global src/proxy.ts (Next 16's rename of middleware.ts) was tried
 * first, but @opennextjs/cloudflare (currently latest, v1.20.2) doesn't
 * support Node.js Proxy/middleware — and Next 16 made Proxy Node.js-runtime
 * by default with no way to opt back into Edge (`runtime` is not a valid
 * Proxy config option and throws if set). So there is currently no
 * deployable single choke point for this on Cloudflare Workers; this
 * per-page call is the workaround until one of those two things changes.
 * Public pages (/login, /signup, /showcase/[shareId]) don't call this.
 */
export async function requireSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}
