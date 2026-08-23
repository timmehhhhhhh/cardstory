import type { DeckFormat, DeckSection } from "@/lib/deck-crafting/formats/types";

/** A deck card enriched with just the catalog fields validate() needs — callers pass whatever CatalogItem lookup they already did (see selectors.ts). */
export interface ValidatableCard {
  section: string;
  catalogItemId: string;
  name: string;
  cardType: string | null;
  quantity: number;
}

export interface SectionResult {
  section: DeckSection;
  count: number;
  /** Cards placed in this section whose cardType doesn't actually match its rule — surfaced so a stale/mismatched placement isn't silently miscounted. */
  mismatched: ValidatableCard[];
  ok: boolean; // count within [min, max]
}

export interface CombinedCountResult {
  id: string;
  label: string;
  min: number;
  max: number | null;
  count: number;
  ok: boolean;
}

export interface CopyLimitViolation {
  name: string;
  count: number;
  max: number;
}

export interface BannedCardPresent {
  name: string;
  quantity: number;
}

export interface DeckValidation {
  sections: SectionResult[];
  combinedCounts: CombinedCountResult[];
  copyLimitViolations: CopyLimitViolation[];
  bannedCardsPresent: BannedCardPresent[];
  /** Every section (and combined-count rule) at/within its required range, and no copy-limit violations — ignores the banlist, which never blocks completeness. */
  isComplete: boolean;
  /** isComplete AND no banned cards present. */
  isTournamentLegal: boolean;
}

function matchesTypeList(cardType: string | null, list: string[] | null): boolean {
  if (list === null) return true;
  if (cardType === null) return false;
  return list.some((needle) => cardType.includes(needle));
}

function isExcluded(cardType: string | null, excludeList: string[] | undefined): boolean {
  if (!excludeList || cardType === null) return false;
  return excludeList.some((needle) => cardType.includes(needle));
}

/** Whether `card` is an eligible member of `section` per its cardType rules — used both for live-count validation and to filter a card picker's results down to what a given zone actually accepts. */
export function cardMatchesSection(cardType: string | null, section: DeckSection): boolean {
  return matchesTypeList(cardType, section.cardTypeContains) && !isExcluded(cardType, section.excludeCardTypeContains);
}

/**
 * Evaluates one deck's cards against its format's rules. Pure and
 * synchronous — callers resolve catalogItemId -> name/cardType first (see
 * src/lib/deck-crafting/selectors.ts), so this has no knowledge of Prisma
 * or the local/remote store split and can run identically for anonymous
 * and signed-in decks.
 */
export function validateDeck(cards: ValidatableCard[], format: DeckFormat): DeckValidation {
  const sections: SectionResult[] = format.sections.map((section) => {
    const inSection = cards.filter((c) => c.section === section.id);
    const mismatched = inSection.filter((c) => !cardMatchesSection(c.cardType, section));
    const count = inSection.reduce((sum, c) => sum + c.quantity, 0);
    const ok = count >= section.min && (section.max === null || count <= section.max);
    return { section, count, mismatched, ok };
  });

  const combinedCounts: CombinedCountResult[] = (format.combinedCounts ?? []).map((rule) => {
    const count = cards
      .filter((c) => rule.sections.includes(c.section))
      .reduce((sum, c) => sum + c.quantity, 0);
    const ok = count >= rule.min && (rule.max === null || count <= rule.max);
    return { id: rule.id, label: rule.label, min: rule.min, max: rule.max, count, ok };
  });

  const pooled = cards.filter((c) => format.copyLimit.appliesToSections.includes(c.section));
  const byName = new Map<string, { count: number; cardType: string | null }>();
  for (const c of pooled) {
    const key = c.name.toLowerCase();
    const existing = byName.get(key);
    byName.set(key, { count: (existing?.count ?? 0) + c.quantity, cardType: existing?.cardType ?? c.cardType });
  }
  const copyLimitViolations: CopyLimitViolation[] = [];
  for (const [key, { count, cardType }] of byName) {
    const exempt = format.copyLimit.exemptCardTypeContains;
    if (exempt && matchesTypeList(cardType, exempt)) continue;
    if (count > format.copyLimit.max) {
      const original = pooled.find((c) => c.name.toLowerCase() === key)!.name;
      copyLimitViolations.push({ name: original, count, max: format.copyLimit.max });
    }
  }

  const bannedLower = new Set(format.bannedCardNames.map((n) => n.toLowerCase()));
  const bannedByName = new Map<string, BannedCardPresent>();
  for (const c of cards) {
    if (!bannedLower.has(c.name.toLowerCase())) continue;
    const existing = bannedByName.get(c.name);
    bannedByName.set(c.name, { name: c.name, quantity: (existing?.quantity ?? 0) + c.quantity });
  }
  const bannedCardsPresent = Array.from(bannedByName.values());

  const isComplete =
    sections.every((s) => s.ok) && combinedCounts.every((c) => c.ok) && copyLimitViolations.length === 0;
  const isTournamentLegal = isComplete && bannedCardsPresent.length === 0;

  return { sections, combinedCounts, copyLimitViolations, bannedCardsPresent, isComplete, isTournamentLegal };
}
