import type { Metadata } from "next";
import { SettingsClient } from "@/app/settings/_components/settings-client";
import { requireSession } from "@/lib/auth/require-session";

export const metadata: Metadata = { title: "User Settings" };

export default async function SettingsPage() {
  await requireSession();
  return <SettingsClient />;
}
