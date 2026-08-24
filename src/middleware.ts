import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

/**
 * Requires a signed-in session for every route except: /login and /signup
 * (what a signed-out visitor must be able to reach to become signed in),
 * NextAuth's own /api/auth/* routes, Next's static assets, the app-router
 * icon file conventions (icon.png, apple-icon.png — favicon.ico used to be
 * the only one of these and is still excluded by name for any cached/old
 * requests, but the icon/apple-icon routes need the same treatment or a
 * signed-out visitor, including on /login itself, gets redirected instead
 * of the icon), and /showcase/* + /api/showcase/* — a showcase's whole point is a public,
 * shareable link (see README's "publish a shareable showcase"); the
 * person opening one is typically not a CardStory user at all, so gating
 * it would break sharing outright. Everything else — Explore, PC, card
 * pages, every other API route — redirects to /login (with a callbackUrl
 * back to where they were headed) before rendering.
 *
 * A systematic complement to src/lib/auth/require-session.ts's per-page
 * calls (left in place as harmless redundant defense-in-depth) — this is
 * the single choke point that guarantees a new page can't accidentally
 * ship ungated by forgetting to call requireSession().
 *
 * Builds its own `auth` from src/auth.config.ts rather than importing
 * `auth` from src/auth.ts — that file's Credentials provider pulls in
 * bcryptjs and Prisma (via authorize()'s db lookup), neither of which the
 * Edge/Workers middleware runtime supports, and neither of which
 * middleware needs: reading/decoding an existing JWT session cookie
 * doesn't require the provider that originally issued it. JWT sessions
 * (no DB adapter) mean this needs no database access either way, so it's
 * safe to run here.
 *
 * Uses the legacy `middleware.ts` filename rather than Next 16's `proxy.ts`
 * rename on purpose — see src/auth.config.ts's comment for why: `proxy.ts`
 * defaults to the Node.js runtime with no opt-out, which
 * @opennextjs/cloudflare can't run, while `middleware.ts` still compiles to
 * genuine Edge Runtime (confirmed via the build's middleware-manifest.json).
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: [
    "/((?!login|signup|api/auth|showcase|api/showcase|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png).*)",
  ],
};
