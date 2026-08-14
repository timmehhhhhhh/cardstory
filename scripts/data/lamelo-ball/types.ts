/** Shared shape for scripts/data/lamelo-ball/<season>.ts checklist files. */

export type ChecklistCardType = "base" | "insert" | "short_print";

export interface LameloParallel {
  /** e.g. "Silver", "Red Wave", "Gold Vinyl" — never "Base", that's implied. */
  name: string;
  /** Print run, e.g. "99", or "1" for a 1-of-1; omit if unnumbered. */
  serialLimit?: string;
}

export interface LameloCardEntry {
  year: number;
  /** Manufacturer, e.g. "Panini", "Topps". */
  distributor: string;
  /** Just the product line, e.g. "Prizm", "Mosaic", "Donruss Optic". */
  setName: string;
  cardNumber?: string;
  cardType: ChecklistCardType;
  teamName?: string;
  isAutograph?: boolean;
  isRelic?: boolean;
  /** Print run of the base/unparalleled version itself, e.g. "8" for an inherently short-printed card with no named parallel tiers. Leave unset for cards whose scarcity is fully expressed through `parallels` instead. */
  serialLimit?: string;
  /** Front image — external reference link, only set when confidently matched. */
  imageUrl?: string;
  /** Back image — external reference link. Rare: card backs are seldom photographed. */
  imageBackUrl?: string;
  /** Where this card and its image(s) were verified. */
  sourceUrl?: string;
  /** Every parallel this card comes in, beyond the base version (always implied). */
  parallels?: LameloParallel[];
}
