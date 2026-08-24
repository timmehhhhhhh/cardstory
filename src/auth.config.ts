import type { NextAuthConfig } from "next-auth";

/**
 * The subset of the NextAuth config that's safe to run in
 * src/middleware.ts's Edge runtime — no `providers`, since middleware only
 * ever reads an existing JWT session, never authenticates one. `src/auth.ts`
 * (the full config, used by the actual sign-in route and everywhere else)
 * spreads this in and adds the Credentials provider, which pulls in
 * bcryptjs + Prisma — neither Edge-safe, and neither needed here. Kept in
 * its own file so middleware.ts's import graph never reaches those: pulling
 * `@/auth` (rather than this) into middleware bundles bcryptjs's Node
 * `crypto` usage and @prisma/adapter-neon's Node-only debug/env code into a
 * runtime that can't support them.
 *
 * This is what makes a single global request gate deployable at all here:
 * middleware.ts uses the legacy `middleware.ts` filename (not Next 16's
 * `proxy.ts` rename) specifically because `proxy.ts` defaults to the
 * Node.js runtime with no opt-out (throws if `runtime` is set), which
 * @opennextjs/cloudflare can't run — `middleware.ts` is kept as a
 * backward-compatible alias that still compiles to genuine Edge Runtime
 * (confirmed via .next/server/middleware-manifest.json after a build: it
 * lists this under `middleware`/edge-runtime-webpack.js, not `functions`).
 * src/lib/auth/require-session.ts's per-page calls stay in place as
 * harmless redundant defense-in-depth; this is the actual systematic gate.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // See src/auth.ts's identical comment — same reasoning applies to the
  // middleware runtime's request host.
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.uid = user.id;
        token.isVendor = (user as { isVendor?: boolean }).isVendor ?? false;
        token.hidePricing = (user as { hidePricing?: boolean }).hidePricing ?? false;
      }
      // See src/auth.ts's identical callback for why.
      if (trigger === "update" && session && typeof session.isVendor === "boolean") {
        token.isVendor = session.isVendor;
      }
      if (trigger === "update" && session && typeof session.hidePricing === "boolean") {
        token.hidePricing = session.hidePricing;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.uid === "string") {
        session.user.id = token.uid;
        session.user.isVendor = token.isVendor === true;
        session.user.hidePricing = token.hidePricing === true;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
