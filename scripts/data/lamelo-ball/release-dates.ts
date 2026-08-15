/**
 * Real street/release dates for each (year, distributor, setName) product
 * line referenced by the season checklist files in this directory. A whole
 * product line releases on one date and every card/parallel in it shares
 * that date — same "one date per product, not per card" shape as
 * Set.releaseDate for TCGs (see prisma/schema.prisma).
 *
 * Researched via cardboardconnection.com's per-product "Release Date" field
 * (Panini's own hobby-market checklist/date authority), cross-checked
 * against Beckett Media and Panini America's "Knight's Lance" blog release
 * announcements where cardboardconnection didn't give an unambiguous date.
 * Keyed by `${year}|${distributor}|${setName}` (matches LameloCardEntry's
 * fields exactly) so scripts/seed-lamelo-ball.ts can look it up directly.
 *
 * Add an entry here whenever a new season file or product line is added —
 * seedEntry() in scripts/seed-lamelo-ball.ts throws if a combo is missing so
 * this can't silently drift out of sync with the checklist files.
 */
export const RELEASE_DATES: Record<string, string> = {
  // --- 2020-21 season -------------------------------------------------
  "2020|Panini|Prizm": "2021-03-31", // cardboardconnection.com/2020-21-panini-prizm-basketball-nba-cards
  "2020|Panini|Donruss": "2021-03-03", // cardboardconnection.com/2020-21-donruss-basketball-nba-cards
  "2020|Panini|Donruss Optic": "2021-09-17", // cardboardconnection.com/2020-21-donruss-optic-basketball-nba-cards
  "2020|Panini|Mosaic": "2021-12-03", // cardboardconnection.com/2020-21-panini-mosaic-basketball-nba-cards
  "2020|Panini|Select": "2021-07-30", // cardboardconnection.com/2020-21-panini-select-basketball-nba-cards
  "2020|Panini|Chronicles": "2021-11-24", // cardboardconnection.com/2020-21-panini-chronicles-basketball-nba-cards
  "2020|Panini|Hoops": "2021-02-03", // cardboardconnection.com/2020-21-panini-nba-hoops-basketball-cards
  "2020|Panini|Court Kings": "2021-05-26", // cardboardconnection.com/2020-21-panini-court-kings-basketball-cards
  "2020|Panini|Contenders Draft Picks": "2020-10-21", // cardboardconnection.com/2020-21-panini-contenders-draft-picks-basketball-cards
  "2020|Panini|Origins": "2021-04-14", // cardboardconnection.com/2020-21-panini-origins-basketball-nba-cards
  "2020|Panini|Illusions": "2021-11-17", // cardboardconnection.com/2020-21-panini-illusions-basketball-nba-cards
  "2020|Panini|Absolute": "2021-03-24", // cardboardconnection.com/2020-21-panini-absolute-memorabilia-basketball-cards
  "2020|Panini|National Treasures": "2021-08-11", // cardboardconnection.com/2020-21-panini-national-treasures-basketball-nba-cards
  "2020|Panini|Flawless": "2022-01-26", // cardboardconnection.com/2020-21-panini-flawless-basketball-cards (delayed twice from original 2021 slot)
  "2020|Panini|Immaculate Collection": "2021-12-31", // cardboardconnection.com/2020-21-panini-immaculate-collection-basketball-nba-cards
  "2020|Panini|Spectra": "2021-08-20", // cardboardconnection.com/2020-21-panini-spectra-basketball-nba-cards
  "2020|Panini|Obsidian": "2021-09-29", // cardboardconnection.com/2020-21-panini-obsidian-basketball-nba-cards
  "2020|Panini|One and One": "2021-12-08", // cardboardconnection.com/2020-21-panini-one-and-one-basketball-nba-cards
  "2020|Panini|Noir": "2021-07-02", // cardboardconnection.com/2020-21-panini-noir-basketball-cards
  "2020|Panini|Impeccable": "2021-06-16", // cardboardconnection.com/2020-21-panini-impeccable-basketball-nba-cards

  // --- 2021-22 season -------------------------------------------------
  "2021|Panini|Prizm": "2022-07-08", // cardboardconnection.com/2021-22-panini-prizm-basketball-nba-cards
  "2021|Panini|Donruss": "2022-02-25", // cardboardconnection.com/2021-22-donruss-basketball-nba-cards
  "2021|Panini|Donruss Optic": "2022-09-02", // cardboardconnection.com/2021-22-donruss-optic-basketball-nba-cards
  "2021|Panini|Mosaic": "2023-01-25", // cardboardconnection.com/2021-22-panini-mosaic-basketball-nba-cards
  "2021|Panini|Select": "2022-10-26", // cardboardconnection.com/2021-22-panini-select-basketball-nba-cards
  "2021|Panini|Chronicles": "2022-09-21", // cardboardconnection.com/2021-22-panini-chronicles-basketball-nba-cards
  "2021|Panini|Hoops": "2022-01-07", // cardboardconnection.com/2021-22-panini-nba-hoops-basketball-cards
  "2021|Panini|Court Kings": "2022-05-06", // cardboardconnection.com/2021-22-panini-court-kings-basketball-nba-cards
  "2021|Panini|Contenders": "2022-04-13", // cardboardconnection.com/2021-22-panini-contenders-basketball-nba-cards
  "2021|Panini|Origins": "2022-03-11", // cardboardconnection.com/2021-22-panini-origins-basketball-nba-cards
  "2021|Panini|Illusions": "2022-09-09", // cardboardconnection.com/2021-22-panini-illusions-basketball-nba-cards, beckett.com
  "2021|Panini|National Treasures": "2022-07-20", // cardboardconnection.com/2021-22-panini-national-treasures-basketball-nba-cards
  "2021|Panini|Flawless": "2023-05-26", // cardboardconnection.com/2021-22-panini-flawless-basketball-nba-cards
  "2021|Panini|Immaculate Collection": "2023-01-18", // cardboardconnection.com/2021-22-panini-immaculate-collection-basketball-nba-cards
  "2021|Panini|Spectra": "2022-10-21", // cardboardconnection.com/2021-22-panini-spectra-basketball-nba-cards
  "2021|Panini|Obsidian": "2022-08-17", // cardboardconnection.com/2021-22-panini-obsidian-basketball-nba-cards
  "2021|Panini|One and One": "2022-11-04", // cardboardconnection.com/2021-22-panini-one-and-one-basketball-nba-cards
  "2021|Panini|Noir": "2022-06-08", // cardboardconnection.com/2021-22-panini-noir-basketball-nba-cards
  "2021|Panini|Impeccable": "2022-05-25", // cardboardconnection.com/2021-22-panini-impeccable-basketball-nba-cards

  // --- 2022-23 season -------------------------------------------------
  "2022|Panini|Prizm": "2023-04-12", // cardboardconnection.com/2022-23-panini-prizm-basketball-nba-cards
  "2022|Panini|Donruss": "2023-03-08", // cardboardconnection.com/2022-23-donruss-basketball-nba-cards
  "2022|Panini|Donruss Optic": "2023-05-10", // cardboardconnection.com/2022-23-donruss-optic-basketball-nba-cards
  "2022|Panini|Mosaic": "2023-09-01", // cardboardconnection.com/2022-23-panini-mosaic-basketball-nba-cards
  "2022|Panini|Select": "2023-06-28", // cardboardconnection.com/2022-23-panini-select-basketball-nba-cards
};

/** Looks up the researched release date for a checklist entry's product line. */
export function lookupReleaseDate(
  year: number,
  distributor: string,
  setName: string
): Date | undefined {
  const iso = RELEASE_DATES[`${year}|${distributor}|${setName}`];
  return iso ? new Date(`${iso}T00:00:00.000Z`) : undefined;
}
