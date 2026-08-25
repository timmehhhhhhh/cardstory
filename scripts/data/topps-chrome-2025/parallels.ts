import type { ChecklistParallel } from "./types";

/**
 * Every named parallel/refractor confirmed released for 2025-26 Topps
 * Chrome Basketball base cards, verified against sportscardspro.com's
 * per-card checklist (card #1, Pascal Siakam — every parallel below priced
 * on that card's page) — ordered least-to-most rare, exactly matching that
 * page's own ordering. Every base card in base-set.ts gets this same list,
 * since named parallels and print runs are constant across the whole
 * product (confirmed by cross-checking card #2, Zaccharie Risacher, whose
 * list matches this one exactly aside from the conditional Image Variation
 * tier — see IMAGE_VARIATION_PARALLELS below).
 */
export const BASE_PARALLELS: ChecklistParallel[] = [
  // Unnumbered
  { name: "Basketball Refractor" },
  { name: "Blue X-Fractor" },
  { name: "Lightboard Logo Refractor" },
  { name: "Negative Refractor" },
  { name: "Prism Refractor" },
  { name: "Pulsar Refractor" },
  { name: "RayWave Refractor" },
  { name: "Red White Blue Refractor" },
  { name: "Refractor" },
  { name: "Skylight Refractor" },
  { name: "Wave Refractor" },
  { name: "X-Fractor" },
  // Numbered, least to most rare
  { name: "Magenta Refractor", serialLimit: "399" },
  { name: "Teal Refractor", serialLimit: "299" },
  { name: "RayWave Yellow Refractor", serialLimit: "275" },
  { name: "Yellow Basketball Refractor", serialLimit: "275" },
  { name: "Yellow Refractor", serialLimit: "275" },
  { name: "Aqua Basketball Refractor", serialLimit: "199" },
  { name: "Aqua Refractor", serialLimit: "199" },
  { name: "RayWave Aqua Refractor", serialLimit: "199" },
  { name: "Blue Basketball Refractor", serialLimit: "150" },
  { name: "Blue Refractor", serialLimit: "150" },
  { name: "Blue Wave Refractor", serialLimit: "150" },
  { name: "RayWave Blue Refractor", serialLimit: "150" },
  { name: "Green Basketball Refractor", serialLimit: "99" },
  { name: "Green Refractor", serialLimit: "99" },
  { name: "Green Wave Refractor", serialLimit: "99" },
  { name: "RayWave Green Refractor", serialLimit: "99" },
  { name: "Pulsar Purple Refractor", serialLimit: "75" },
  { name: "Purple Basketball Refractor", serialLimit: "75" },
  { name: "Purple Refractor", serialLimit: "75" },
  { name: "Purple Wave Refractor", serialLimit: "75" },
  { name: "RayWave Purple Refractor", serialLimit: "75" },
  { name: "Gold Basketball Refractor", serialLimit: "50" },
  { name: "Gold Geometric Refractor", serialLimit: "50" },
  { name: "Gold Refractor", serialLimit: "50" },
  { name: "Gold Wave Refractor", serialLimit: "50" },
  { name: "Pulsar Gold Refractor", serialLimit: "50" },
  { name: "RayWave Gold Refractor", serialLimit: "50" },
  { name: "Orange Basketball Refractor", serialLimit: "25" },
  { name: "Orange Geometric Refractor", serialLimit: "25" },
  { name: "Orange Refractor", serialLimit: "25" },
  { name: "Orange Wave Refractor", serialLimit: "25" },
  { name: "Pulsar Orange Refractor", serialLimit: "25" },
  { name: "RayWave Orange Refractor", serialLimit: "25" },
  { name: "1st Day Issue", serialLimit: "12" },
  { name: "Black Basketball Refractor", serialLimit: "10" },
  { name: "Black Geometric Refractor", serialLimit: "10" },
  { name: "Black Refractor", serialLimit: "10" },
  { name: "Black Wave Refractor", serialLimit: "10" },
  { name: "Pulsar Black Refractor", serialLimit: "10" },
  { name: "RayWave Black Refractor", serialLimit: "10" },
  { name: "Tri-Color Refractor", serialLimit: "8" },
  { name: "Frozenfractor", serialLimit: "5" },
  { name: "Pulsar Red Refractor", serialLimit: "5" },
  { name: "RayWave Red Refractor", serialLimit: "5" },
  { name: "Red Basketball Refractor", serialLimit: "5" },
  { name: "Red Geometric Refractor", serialLimit: "5" },
  { name: "Red Refractor", serialLimit: "5" },
  { name: "Red Wave Refractor", serialLimit: "5" },
  { name: "White Geometric Refractor", serialLimit: "2" },
  { name: "Superfractor", serialLimit: "1" },
];

/**
 * The additional parallel tier released only for cards TCDB flags as having
 * an "Image Variation" SP (see BaseCardEntry.hasImageVariation) — confirmed
 * against sportscardspro.com's card #2 (Zaccharie Risacher, which has one)
 * vs. card #1 (Pascal Siakam, which doesn't): every color tier gets an
 * Image Variation counterpart except Magenta/Teal/Yellow/Aqua/Blue/Purple/
 * 1st Day Issue/Tri-Color/White Geometric.
 */
export const IMAGE_VARIATION_PARALLELS: ChecklistParallel[] = [
  { name: "Image Variation" },
  { name: "Green Image Variation", serialLimit: "99" },
  { name: "Gold Image Variation", serialLimit: "50" },
  { name: "Orange Image Variation", serialLimit: "25" },
  { name: "Black Image Variation", serialLimit: "10" },
  { name: "Red Image Variation", serialLimit: "5" },
  { name: "Superfractor Image Variation", serialLimit: "1" },
];
