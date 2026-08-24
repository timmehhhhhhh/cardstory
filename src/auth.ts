import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "@/auth.config";

/**
 * Credentials-only auth (email + password) with JWT sessions — no
 * Account/Session/VerificationToken tables and no Prisma adapter, since
 * there's no OAuth provider to link and JWT sessions need no DB-backed
 * session state. Trade-off: sessions can't be revoked server-side before
 * they expire; acceptable for this app.
 *
 * Extends src/auth.config.ts's shared (Edge-safe) config with the
 * Credentials provider — see that file's comment for why the provider
 * (and everything it pulls in — bcryptjs, Prisma) lives only here, not
 * there.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // trustHost/pages/session/callbacks all come from authConfig above —
  // Auth.js only auto-trusts the request host on Vercel/Cloudflare Pages
  // (via VERCEL/CF_PAGES env vars); this app deploys to Cloudflare Workers,
  // which isn't auto-detected, so authConfig sets it explicitly. Without
  // that, every /api/auth/* request in production is rejected with
  // UntrustedHost before it reaches authorize() below, so sign-in silently
  // fails with a generic "incorrect credentials" error.
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "")
          .toLowerCase()
          .trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          isVendor: user.isVendor,
          hidePricing: user.hidePricing,
        };
      },
    }),
  ],
});
