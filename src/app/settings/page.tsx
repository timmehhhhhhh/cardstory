import type { Metadata } from "next";
import { SettingsClient } from "@/app/settings/_components/settings-client";
import { requireSession } from "@/lib/auth/require-session";
import { ADMIN_MANUAL_ADD_GAMES } from "@/lib/games/registry";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireSession();
  // Only actually rendered for an admin session (SettingsClient checks
  // session.user.isAdmin), but computed here rather than in the client
  // component so ADMIN_MANUAL_ADD_GAMES's import of the provider registry
  // (lib/games/registry.ts) stays out of the client bundle.
  return <SettingsClient adminAddCardGames={ADMIN_MANUAL_ADD_GAMES} />;
}
