import type { Metadata } from "next";
import { DeckCraftingClient } from "@/app/deck-crafting/_components/deck-crafting-client";

export const metadata: Metadata = { title: "Deck Crafting" };

export default function DeckCraftingPage() {
  return <DeckCraftingClient />;
}
