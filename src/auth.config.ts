import type { NextAuthConfig } from "next-auth";

/**
 * The subset of the NextAuth config that's safe to run in
 * src/middleware.ts's Edge/Workers runtime — no `providers`, since
 * middleware only ever reads an existing JWT session, never authenticates
 * one. `src/auth.ts` (the full config, used by the actual sign-in route and
 * everywhere else) spreads this in and adds the Credentials provider, which
 * pulls in bcryptjs + Prisma — neither Edge-safe, and neither needed here.
 * Kept in its own file so middleware.ts's import graph never reaches those:
 * pulling `@/auth` (rather than this) into middleware bundles bcryptjs's
 * Node `crypto` usage and @prisma/adapter-neon's Node-only debug/env code
 * into a runtime that can't support them.
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
      }
      // See src/auth.ts's identical callback for why.
      if (trigger === "update" && session && typeof session.isVendor === "boolean") {
        token.isVendor = session.isVendor;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.uid === "string") {
        session.user.id = token.uid;
        session.user.isVendor = token.isVendor === true;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
