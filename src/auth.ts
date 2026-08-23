import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";

/**
 * Credentials-only auth (email + password) with JWT sessions — no
 * Account/Session/VerificationToken tables and no Prisma adapter, since
 * there's no OAuth provider to link and JWT sessions need no DB-backed
 * session state. Trade-off: sessions can't be revoked server-side before
 * they expire; acceptable for this app.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Auth.js only auto-trusts the request host on Vercel/Cloudflare Pages
  // (via VERCEL/CF_PAGES env vars); this app deploys to Cloudflare Workers,
  // which isn't auto-detected. Without this, every /api/auth/* request in
  // production is rejected with UntrustedHost before it reaches authorize(),
  // so sign-in silently fails with a generic "incorrect credentials" error.
  trustHost: true,
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

        return { id: user.id, email: user.email, isVendor: user.isVendor };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.uid = user.id;
        token.isVendor = (user as { isVendor?: boolean }).isVendor ?? false;
      }
      // Lets the client refresh isVendor into the JWT right after toggling
      // it (see account-menu.tsx's `update({ isVendor })` call) without
      // requiring a full sign-out/sign-in — session() only ever reads what
      // jwt() already put on the token, so it has to land here.
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
});
