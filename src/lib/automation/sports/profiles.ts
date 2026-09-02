/**
 * Candidate checklist-gallery sources for the sports-image scraper (see
 * ./image-scrape.ts). Final site selection is deferred to whenever this leg
 * is actually turned on — SPORTS_IMAGE_SCRAPE_ENABLED is off by default (see
 * that var's .env.example doc) specifically because neither candidate's
 * robots.txt/ToS has been checked yet. Do NOT flip the flag on, and do not
 * point this at a live site, until that's done by a human.
 *
 * cardboardconnection.com (Beckett-affiliated checklist galleries spanning
 * NBA/F1/UFC) is the primary candidate — closest precedent to this repo's
 * existing publisher-checklist crawlers (scripts/crawl-pokemon-*). Search
 * selectors below are placeholders (`TODO`), not confirmed against live
 * markup — the query target (non-parallel SportsCardItem rows) is real, the
 * scrape mechanics are not wired to a real page shape yet.
 */
import type { Sport } from "@prisma/client";

export interface SportsImageSourceProfile {
  id: string;
  displayName: string;
  /** Which Sport enum values this source has checklist coverage for. */
  sports: Sport[];
  /** robots.txt/ToS status — must be "confirmed-allowed" by a human before this source is used for real, regardless of the env flag. */
  complianceStatus: "unconfirmed" | "confirmed-allowed";
}

export const SPORTS_IMAGE_SOURCE_PROFILES: SportsImageSourceProfile[] = [
  {
    id: "cardboardconnection",
    displayName: "Cardboard Connection",
    sports: ["NBA", "F1", "UFC"],
    complianceStatus: "unconfirmed",
  },
  {
    id: "tradingcarddb",
    displayName: "Trading Card Database",
    // Secondary option for thinner categories like tennis — see the plan's
    // §4 for why this is listed as a fallback rather than primary.
    sports: ["TENNIS"],
    complianceStatus: "unconfirmed",
  },
];
