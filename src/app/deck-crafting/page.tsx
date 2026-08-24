import type { Metadata } from "next";
import { DeckCraftingClient } from "@/app/deck-crafting/_components/deck-crafting-client";
import { requireSession } from "@/lib/auth/require-session";

export const metadata: Metadata = { title: "Deck Crafting" };

export default async function DeckCraftingPage() {
  await requireSession();
  return <DeckCraftingClient />;
}
