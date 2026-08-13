import type { Sport } from "@prisma/client";

export interface SportMeta {
  id: Sport;
  name: string;
  shortLabel: string;
  /** Term SportsCardsPro's catalog uses in its console-name field, e.g. "Basketball Cards 1986 Fleer". */
  searchLabel: string;
}

export const SPORTS: SportMeta[] = [
  { id: "NBA", name: "Basketball (NBA)", shortLabel: "NBA", searchLabel: "Basketball" },
  { id: "F1", name: "Formula 1", shortLabel: "F1", searchLabel: "Formula 1" },
  { id: "UFC", name: "UFC / MMA", shortLabel: "UFC", searchLabel: "UFC" },
  { id: "TENNIS", name: "Tennis", shortLabel: "Tennis", searchLabel: "Tennis" },
];

export function getSportMeta(sport: string): SportMeta | undefined {
  return SPORTS.find((s) => s.id === sport);
}
