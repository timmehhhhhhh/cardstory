/**
 * Local checklist-entry shapes for 2025-26 Topps Chrome Basketball, mirroring
 * scripts/data/lamelo-ball/types.ts's conventions. Kept as a separate module
 * (rather than importing LaMelo's types) per that folder's own "one module
 * per checklist" convention.
 */

export interface ChecklistParallel {
  name: string;
  /** The print run this parallel is numbered to, e.g. "99" or "1" for a 1-of-1. Omitted for unnumbered parallels. */
  serialLimit?: string;
}

export interface BaseCardEntry {
  cardNumber: string;
  playerName: string;
  teamName: string;
  /** TCDB flags this as a Rookie Card — informational only, doesn't affect cardType. */
  isRookie: boolean;
  /**
   * True when this specific card was also released as an "Image Variation"
   * SP (confirmed per-card via TCDB's checklist, since — unlike every other
   * parallel — Image Variation isn't released for every card in the set).
   */
  hasImageVariation: boolean;
}
