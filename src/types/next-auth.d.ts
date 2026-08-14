import type { DefaultSession } from "next-auth";

// Augments the session's `user` with the account id, set by the jwt/session
// callbacks in src/auth.ts.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
