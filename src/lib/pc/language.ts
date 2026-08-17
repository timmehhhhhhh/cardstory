import type { ItemLanguage } from "@/lib/pc/types";

const ITEM_LANGUAGES: readonly ItemLanguage[] = ["EN", "JP", "CN", "TW", "KR"];

/** Narrows an arbitrary CatalogItem.language string (unconstrained at the DB level) to a known ItemLanguage. */
export function isItemLanguage(value: string | null | undefined): value is ItemLanguage {
  return !!value && (ITEM_LANGUAGES as readonly string[]).includes(value);
}
