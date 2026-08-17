import type { DefaultSession } from "next-auth";

// Augments the session's `user` with the account id and vendor flag, set by
// the jwt/session callbacks in src/auth.ts.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isVendor: boolean;
    } & DefaultSession["user"];
  }
}
