import { describe, expect, it } from "vitest";
import {
  addScannedPage,
  advanceStage,
  buildPagePlacements,
  computePageSummary,
  confirmPageAt,
  createSession,
  detectBinderConflicts,
  hasUnresolvedConflicts,
  markPocketEmpty,
  markPocketSkip,
  markPocketUnidentified,
  placementsToApply,
  resolveBinderConflict,
  resolvePocketAmbiguity,
  setPlacementCandidate,
  toPlacementHoldingInputs,
} from "./session-state";
import type { CandidateMatch, DetectedCard, ScanResult } from "@/lib/scanning";
import type { ImportPageResult } from "./types";

let cardCounter = 0;
function makeCandidate(overrides: Partial<CandidateMatch> = {}): CandidateMatch {
  return {
    catalogItemId: "pokemon:base1-4",
    gameId: "pokemon",
    name: "Charizard",
    setName: "Base Set",
    number: "4",
    imageSmallUrl: null,
    score: 0.95,
    ...overrides,
  };
}

function box(centerX: number, centerY: number) {
  return { x: centerX, y: centerY, width: 0, height: 0, centerX, centerY, rotation: 0 as const };
}

function makeCard(overrides: Partial<DetectedCard> = {}): DetectedCard {
  cardCounter += 1;
  return {
    cardId: `card-${cardCounter}`,
    sourceImageId: "source-1",
    boundingBox: box(0.5, 0.5),
    detectedPosition: { index: 0 },
    croppedImage: null,
    orientation: 0,
    detectionConfidence: 0.9,
    identificationStatus: "identified",
    identificationConfidence: 0.9,
    candidates: [makeCandidate()],
    selectedCandidateId: null,
    confidenceLevel: "HIGH",
    needsReview: false,
    error: null,
    skipped: false,
    ...overrides,
  };
}

function makeScanResult(cards: DetectedCard[]): ScanResult {
  return { scanResultId: "scan-1", sourceImageId: "source-1", createdAt: "2026-01-01T00:00:00.000Z", cards, error: null };
}

const defaults = { language: "EN" as const, costBasisCurrency: "USD" as const };
let idCounter = 0;
const makeId = () => `id-${++idCounter}`;

/** Nine boxes, one centered in each 3x3 cell, in row-major pocket order. */
function fullGridCards(): DetectedCard[] {
  const centers = [
    [0.15, 0.15], [0.5, 0.15], [0.85, 0.15],
    [0.15, 0.5], [0.5, 0.5], [0.85, 0.5],
    [0.15, 0.85], [0.5, 0.85], [0.85, 0.85],
  ];
  return centers.map(([cx, cy]) => makeCard({ boundingBox: box(cx, cy) }));
}

describe("buildPagePlacements", () => {
  it("marks every pocket empty for a page with zero detected cards", () => {
    const page = buildPagePlacements(makeScanResult([]), "9", 1, "preview-1");
    expect(page.placements).toHaveLength(9);
    expect(page.placements.every((p) => p.status === "empty")).toBe(true);
    expect(page.physicalPageNumber).toBe(1);
  });

  it("identifies all nine pockets for a completely full page", () => {
    const page = buildPagePlacements(makeScanResult(fullGridCards()), "9", 1, "preview-1");
    expect(page.placements.map((p) => p.status)).toEqual(Array(9).fill("identified"));
    expect(page.placements.map((p) => p.pocketIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("leaves the rest empty for a partially populated page", () => {
    const cards = [makeCard({ boundingBox: box(0.15, 0.15) }), makeCard({ boundingBox: box(0.85, 0.85) })];
    const page = buildPagePlacements(makeScanResult(cards), "9", 1, "preview-1");
    const statuses = page.placements.map((p) => p.status);
    expect(statuses[0]).toBe("identified");
    expect(statuses[8]).toBe("identified");
    expect(statuses.filter((s) => s === "empty")).toHaveLength(7);
  });

  it("keeps duplicate cards on one page as distinct pockets/placements", () => {
    const cards = [makeCard({ boundingBox: box(0.15, 0.15) }), makeCard({ boundingBox: box(0.5, 0.15) })];
    const page = buildPagePlacements(makeScanResult(cards), "9", 1, "preview-1");
    expect(page.placements[0].status).toBe("identified");
    expect(page.placements[1].status).toBe("identified");
    expect(page.placements[0].card!.cardId).not.toBe(page.placements[1].card!.cardId);
  });

  it("flags an unidentified card (no confident candidate) rather than guessing", () => {
    const card = makeCard({
      confidenceLevel: "UNIDENTIFIED",
      identificationStatus: "unidentified",
      candidates: [],
    });
    const page = buildPagePlacements(makeScanResult([card]), "9", 1, "preview-1");
    expect(page.placements[4].status).toBe("unidentified");
  });

  it("flags a grid conflict when two boxes land in the same pocket, offering both", () => {
    const cards = [makeCard({ boundingBox: box(0.1, 0.1) }), makeCard({ boundingBox: box(0.15, 0.12) })];
    const page = buildPagePlacements(makeScanResult(cards), "9", 1, "preview-1");
    expect(page.placements[0].status).toBe("conflict");
    expect(page.placements[0].ambiguousCards).toHaveLength(2);
  });

  it("supports a 3x4 layout with row-major pocketIndex = row*4+col", () => {
    const cards = [makeCard({ boundingBox: box(0.9, 0.1) })];
    const page = buildPagePlacements(makeScanResult(cards), "12", 1, "preview-1");
    expect(page.placements).toHaveLength(12);
    expect(page.placements[3].status).toBe("identified");
  });

  it("preserves the physical page number exactly as given, including a non-sequential one", () => {
    const page = buildPagePlacements(makeScanResult([]), "9", 3, "preview-1");
    expect(page.physicalPageNumber).toBe(3);
  });
});

describe("pocket edits", () => {
  function partialPage(): ImportPageResult {
    const cards = [makeCard({ boundingBox: box(0.15, 0.15) })];
    return buildPagePlacements(makeScanResult(cards), "9", 1, "preview-1");
  }

  it("markPocketEmpty clears a detected card without touching other pockets", () => {
    const page = partialPage();
    const next = markPocketEmpty(page, 0);
    expect(next.placements[0].status).toBe("empty");
    expect(next.placements[0].card).toBeUndefined();
    expect(next.placements.slice(1).every((p) => p.status === "empty")).toBe(true);
  });

  it("markPocketSkip excludes a pocket distinctly from empty", () => {
    const page = partialPage();
    const next = markPocketSkip(page, 0);
    expect(next.placements[0].status).toBe("skip");
    expect(toPlacementHoldingInputs(next, defaults, makeId)).toHaveLength(0);
  });

  it("markPocketUnidentified reverts an identified pocket back to needing review", () => {
    const page = partialPage();
    const next = markPocketUnidentified(page, 0);
    expect(next.placements[0].status).toBe("unidentified");
    expect(next.placements[0].card!.selectedCandidateId).toBeNull();
  });

  it("setPlacementCandidate corrects a wrong identification and clears needsReview", () => {
    const page = buildPagePlacements(
      makeScanResult([makeCard({ boundingBox: box(0.15, 0.15), confidenceLevel: "LOW", needsReview: true })]),
      "9",
      1,
      "preview-1"
    );
    expect(page.placements[0].status).toBe("unidentified");
    const corrected = setPlacementCandidate(page, 0, makeCandidate({ catalogItemId: "pokemon:base1-2", name: "Blastoise" }));
    expect(corrected.placements[0].status).toBe("identified");
    expect(corrected.placements[0].card!.selectedCandidateId).toBe("pokemon:base1-2");
    expect(corrected.placements[0].card!.needsReview).toBe(false);
  });

  it("resolvePocketAmbiguity picks one of the conflicting cards and drops the other", () => {
    const cardA = makeCard({ boundingBox: box(0.1, 0.1) });
    const cardB = makeCard({ boundingBox: box(0.15, 0.12) });
    const page = buildPagePlacements(makeScanResult([cardA, cardB]), "9", 1, "preview-1");
    expect(page.placements[0].status).toBe("conflict");
    const resolved = resolvePocketAmbiguity(page, 0, cardA);
    expect(resolved.placements[0].status).toBe("identified");
    expect(resolved.placements[0].card!.cardId).toBe(cardA.cardId);
  });
});

describe("detectBinderConflicts / resolveBinderConflict", () => {
  it("flags an identified placement whose pocket is already occupied in the live binder", () => {
    const page = buildPagePlacements(makeScanResult(fullGridCards()), "9", 1, "preview-1");
    const existingPockets = Array(9).fill(null);
    existingPockets[0] = "holding-existing";
    const withConflicts = detectBinderConflicts(page, existingPockets);
    expect(withConflicts.placements[0].status).toBe("conflict");
    expect(withConflicts.placements[0].existingHoldingId).toBe("holding-existing");
    expect(withConflicts.placements[1].status).toBe("identified");
    expect(hasUnresolvedConflicts(withConflicts)).toBe(true);
  });

  it("'keep' excludes the pocket from commit; 'replace' includes it", () => {
    const page = buildPagePlacements(makeScanResult(fullGridCards()), "9", 1, "preview-1");
    const existingPockets = Array(9).fill(null);
    existingPockets[0] = "holding-existing";
    const withConflicts = detectBinderConflicts(page, existingPockets);

    const kept = resolveBinderConflict(withConflicts, 0, "keep");
    expect(hasUnresolvedConflicts(kept)).toBe(false);
    expect(toPlacementHoldingInputs(kept, defaults, makeId).some((h) => h.pocketIndex === 0)).toBe(false);

    const replaced = resolveBinderConflict(withConflicts, 0, "replace");
    expect(toPlacementHoldingInputs(replaced, defaults, makeId).some((h) => h.pocketIndex === 0)).toBe(true);
  });

  it("does not touch pockets that were never in conflict", () => {
    const page = buildPagePlacements(makeScanResult(fullGridCards()), "9", 1, "preview-1");
    const existingPockets = Array(9).fill(null);
    existingPockets[0] = "holding-existing";
    const withConflicts = detectBinderConflicts(page, existingPockets);
    for (let i = 1; i < 9; i++) {
      expect(withConflicts.placements[i]).toEqual(page.placements[i]);
    }
  });
});

describe("toPlacementHoldingInputs", () => {
  it("produces one holding row per identified pocket, carrying pocketIndex through", () => {
    const page = buildPagePlacements(makeScanResult(fullGridCards()), "9", 1, "preview-1");
    const holdings = toPlacementHoldingInputs(page, defaults, makeId);
    expect(holdings).toHaveLength(9);
    expect(new Set(holdings.map((h) => h.pocketIndex)).size).toBe(9);
    expect(holdings.every((h) => h.quantity === 1)).toBe(true);
  });

  it("excludes empty, skipped, unidentified, and unresolved-conflict pockets", () => {
    const cards = [
      makeCard({ boundingBox: box(0.15, 0.15) }), // identified
      makeCard({ boundingBox: box(0.5, 0.15), confidenceLevel: "UNIDENTIFIED", identificationStatus: "unidentified", candidates: [] }),
    ];
    let page = buildPagePlacements(makeScanResult(cards), "9", 1, "preview-1");
    page = markPocketSkip(page, 0);
    expect(toPlacementHoldingInputs(page, defaults, makeId)).toHaveLength(0);
  });
});

describe("placementsToApply (compensating-strategy primitive)", () => {
  it("only returns pockets whose holding write actually succeeded", () => {
    const page = buildPagePlacements(makeScanResult(fullGridCards()), "9", 1, "preview-1");
    const items = toPlacementHoldingInputs(page, defaults, makeId);
    const results = items.map((item, i) => ({
      id: item.id,
      status: (i === 3 ? "failed" : "created") as "created" | "failed",
      error: i === 3 ? "db unreachable" : undefined,
    }));
    const toApply = placementsToApply(items, results);
    expect(toApply).toHaveLength(8);
    expect(toApply.some((p) => p.pocketIndex === 3)).toBe(false);
  });

  it("is idempotent on retry: re-running with a fully-succeeded retry result includes the previously-failed pocket without duplicating others", () => {
    const page = buildPagePlacements(makeScanResult(fullGridCards()), "9", 1, "preview-1");
    const items = toPlacementHoldingInputs(page, defaults, makeId);
    const retryResults = items.map((item) => ({ id: item.id, status: "created" as const }));
    const toApply = placementsToApply(items, retryResults);
    expect(toApply).toHaveLength(9);
    expect(new Set(toApply.map((p) => p.pocketIndex)).size).toBe(9);
  });
});

describe("session / page sequencing", () => {
  it("advanceStage enforces the linear sequence and rejects skipping a stage", () => {
    const session = createSession("binder-1", "9", "session-1");
    expect(session.stage).toBe("DRAFT");
    expect(() => advanceStage(session, "COMMITTED")).toThrow();
    const reviewing = advanceStage(session, "REVIEWING");
    expect(reviewing.stage).toBe("REVIEWING");
  });

  it("preserves each page's physical page number across a sequence, including a skipped number", () => {
    let session = createSession("binder-1", "9", "session-1");
    const page1 = buildPagePlacements(makeScanResult([]), "9", 1, "preview-1");
    session = addScannedPage(session, page1);
    session = confirmPageAt(session, 0);

    const page3 = buildPagePlacements(makeScanResult([]), "9", 3, "preview-3");
    session = addScannedPage(session, page3);
    session = confirmPageAt(session, 1);

    expect(session.pages.map((p) => p.physicalPageNumber)).toEqual([1, 3]);
    expect(session.pages.every((p) => p.confirmed)).toBe(true);
  });
});

describe("computePageSummary", () => {
  it("counts every status bucket correctly for a mixed page", () => {
    const cards = [
      makeCard({ boundingBox: box(0.15, 0.15) }), // -> identified (pocket 0)
      makeCard({ boundingBox: box(0.5, 0.15), confidenceLevel: "UNIDENTIFIED", identificationStatus: "unidentified", candidates: [] }), // -> unidentified (pocket 1)
    ];
    const page = buildPagePlacements(makeScanResult(cards), "9", 1, "preview-1");
    const summary = computePageSummary(page);
    expect(summary.total).toBe(9);
    expect(summary.identified).toBe(1);
    expect(summary.unidentified).toBe(1);
    expect(summary.empty).toBe(7);
    expect(summary.readyToCommit).toBe(1);
  });
});
