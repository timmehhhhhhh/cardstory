import type { EnrichedHolding } from "@/lib/pc/selectors";
import type { EnrichedShortlistItem } from "@/lib/shortlist/selectors";
import { CARD_CONDITION_LABELS } from "@/lib/constants";
import { formatMoneyIn } from "@/lib/utils/format";

/**
 * A visual grouping of rows that all reference the same underlying card —
 * multiple copies of the same catalog/sports card, each still its own row
 * (its own acquisition date/condition/price/notes — its own "card story").
 * `faces` is ordered newest-first: `faces[0]` is the copy that most recently
 * entered the collection/shortlist, matching how a physical stack would be
 * built (newest on top).
 *
 * Deliberately generic over T rather than tied to Holding/ShortlistItem —
 * PC, Business Inventory (both Holding) and Shortlist all need the exact
 * same "collapse duplicates, keep each one's own story reachable" behavior,
 * and the only thing that differs between them is which fields count as
 * "identity" and "recency". See groupHoldingsIntoStacks/
 * groupShortlistIntoStacks below for the two call-site instantiations.
 */
export interface CardStack<T> {
  /** Stable across renders as long as membership doesn't change — safe as a React key. */
  key: string;
  faces: T[];
}

/**
 * Groups rows into stacks by `identity`, ordering each stack's faces
 * newest-first by `sortKey`. Rows whose `identity` returns null never
 * stack — each becomes its own singleton CardStack, keyed by a fallback so
 * two null-identity rows never collide. Singletons are always returned as
 * length-1 stacks (never unwrapped) so every call site can treat
 * `CardStack<T>[]` as the one shape to render, whether a card has 1 copy or 12.
 */
export function groupIntoStacks<T>(
  rows: T[],
  identity: (row: T) => string | null,
  sortKey: (row: T) => string,
  fallbackKey: (row: T, index: number) => string
): CardStack<T>[] {
  const order: string[] = [];
  const groups = new Map<string, T[]>();

  rows.forEach((row, index) => {
    const id = identity(row);
    const key = id ?? `__unstacked:${fallbackKey(row, index)}`;
    const existing = groups.get(key);
    if (existing) {
      existing.push(row);
    } else {
      groups.set(key, [row]);
      order.push(key);
    }
  });

  return order.map((key) => {
    const faces = [...groups.get(key)!].sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
    return { key, faces };
  });
}

function holdingIdentity(r: EnrichedHolding): string | null {
  const refId = r.kind === "sports" ? r.sportsCardItemId : r.catalogItemId;
  return refId ? `${r.kind ?? "tcg"}:${refId}` : null;
}

/**
 * Groups PC/Business Inventory holdings into stacks, one per distinct
 * catalog/sports card. Custom (hand-keyed) holdings have no catalogItemId/
 * sportsCardItemId and never stack — see holdingIdentity.
 */
export function groupHoldingsIntoStacks(rows: EnrichedHolding[]): CardStack<EnrichedHolding>[] {
  return groupIntoStacks(
    rows,
    holdingIdentity,
    (r) => r.acquiredAt ?? r.createdAt,
    (r) => r.id
  );
}

function shortlistIdentity(r: EnrichedShortlistItem): string | null {
  if (r.kind === "custom") return null;
  const refId = r.kind === "sports" ? r.sportsCardItemId : r.catalogItemId;
  return refId ? `${r.kind}:${refId}` : null;
}

/**
 * Groups shortlist rows into stacks the same way. Each add-to-shortlist
 * click always creates a new row (see use-add-to-shortlist.ts), so a card
 * added from three different sources on three different days already has
 * three genuinely distinct stories to show — this just groups them visually.
 */
export function groupShortlistIntoStacks(
  rows: EnrichedShortlistItem[]
): CardStack<EnrichedShortlistItem>[] {
  return groupIntoStacks(
    rows,
    shortlistIdentity,
    (r) => r.addedAt,
    (r) => r.id
  );
}

/**
 * The "card story" a single copy tells — how/when/for-how-much it entered
 * the collection or shortlist. Deliberately just label/value pairs rather
 * than a typed shape per field: Holdings and Shortlist items track
 * different facts about a copy (acquired date + condition + cost basis vs.
 * added date + asking price + source), and CardStoryDialog only needs to
 * lay them out, not reason about them.
 */
export interface CardStoryFace {
  key: string;
  name: string;
  nameEn: string | null;
  subtitle: string;
  imageUrl: string | null;
  number: string | null;
  fields: { label: string; value: string }[];
}

export function holdingToStoryFace(r: EnrichedHolding): CardStoryFace {
  const fields: { label: string; value: string }[] = [];
  fields.push({
    label: "Acquired",
    value: r.acquiredAt ? new Date(r.acquiredAt).toLocaleDateString() : "Date unknown",
  });
  fields.push({
    label: "Condition",
    value:
      r.condition === "graded"
        ? [r.gradeCompany, r.gradeValue].filter(Boolean).join(" ") || "Graded"
        : (r.rawCondition ?? "Raw"),
  });
  if (r.costBasisTotal > 0) {
    fields.push({ label: "Paid", value: formatMoneyIn(r.costBasisTotal, r.costBasisCurrency) });
  }
  if (r.notes) fields.push({ label: "Notes", value: r.notes });
  return {
    key: r.id,
    name: r.display.name,
    nameEn: r.display.nameEn,
    subtitle: r.display.subtitle,
    imageUrl: r.display.imageUrl,
    number: r.display.number,
    fields,
  };
}

export function shortlistToStoryFace(r: EnrichedShortlistItem): CardStoryFace {
  const fields: { label: string; value: string }[] = [
    { label: "Added", value: new Date(r.addedAt).toLocaleDateString() },
    { label: "Source", value: r.source ?? "Added manually" },
  ];
  if (r.rawCondition) {
    // The one field that differs meaningfully between two faces of the same
    // stack — the same card at two shops is usually two different copies in
    // two different shapes, which is half of why one is cheaper.
    fields.push({
      label: "Condition",
      value: `${CARD_CONDITION_LABELS[r.rawCondition]} (${r.rawCondition})`,
    });
  }
  if (r.askingPrice > 0) {
    fields.push({ label: "Asking price", value: formatMoneyIn(r.askingPrice, r.askingCurrency) });
  }
  if (r.notes) fields.push({ label: "Notes", value: r.notes });
  return {
    key: r.id,
    name: r.display.name,
    nameEn: r.display.nameEn,
    subtitle: r.display.subtitle,
    imageUrl: r.display.imageUrl,
    number: r.display.number,
    fields,
  };
}
