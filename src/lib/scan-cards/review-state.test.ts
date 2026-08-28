import { describe, expect, it } from "vitest";
import {
  buildReviewItems,
  computeBatchSummary,
  setCandidate,
  skipItem,
  toggleInclude,
  toHoldingInputs,
  unskipItem,
  type ScannedPhoto,
} from "./review-state";
import type { CandidateMatch, DetectedCard, ScanResult } from "@/lib/scanning";

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

function makeCard(overrides: Partial<DetectedCard> = {}): DetectedCard {
  cardCounter += 1;
  return {
    cardId: `card-${cardCounter}`,
    sourceImageId: "source-1",
    boundingBox: { x: 0, y: 0, width: 1, height: 1, centerX: 0.5, centerY: 0.5, rotation: 0 },
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

function makeScanResult(cards: DetectedCard[], scanResultId = "scan-1"): ScanResult {
  return { scanResultId, sourceImageId: "source-1", createdAt: "2026-01-01T00:00:00.000Z", cards, error: null };
}

function makePhoto(cards: DetectedCard[], scanResultId = "scan-1"): ScannedPhoto {
  return { previewUrl: `data:image/jpeg;base64,${scanResultId}`, result: makeScanResult(cards, scanResultId) };
}

const defaults = { language: "EN" as const, costBasisCurrency: "USD" as const };
let idCounter = 0;
const makeId = () => `id-${++idCounter}`;

describe("buildReviewItems", () => {
  it("returns an empty list for a photo with zero detected cards", () => {
    expect(buildReviewItems([makePhoto([])])).toEqual([]);
  });

  it("builds one pre-selected, pre-checked item for a single HIGH-confidence card", () => {
    const items = buildReviewItems([makePhoto([makeCard({ detectedPosition: { index: 0 } })])]);
    expect(items).toHaveLength(1);
    expect(items[0].includeInBatch).toBe(true);
    expect(items[0].card.selectedCandidateId).toBe("pokemon:base1-4");
    expect(items[0].card.needsReview).toBe(false);
  });

  it("preserves reading order across multiple cards in one photo", () => {
    const c1 = makeCard({ detectedPosition: { index: 1 } });
    const c2 = makeCard({ detectedPosition: { index: 0 } });
    const items = buildReviewItems([makePhoto([c1, c2])]);
    expect(items.map((i) => i.card.cardId)).toEqual([c2.cardId, c1.cardId]);
  });

  it("treats three identical scanned candidates as three distinct review items", () => {
    const cards = [
      makeCard({ detectedPosition: { index: 0 } }),
      makeCard({ detectedPosition: { index: 1 } }),
      makeCard({ detectedPosition: { index: 2 } }),
    ];
    const items = buildReviewItems([makePhoto(cards)]);
    expect(items).toHaveLength(3);
    expect(new Set(items.map((i) => i.key)).size).toBe(3);
  });

  it("defaults a LOW-confidence card to unchecked with no auto-selected candidate", () => {
    const card = makeCard({
      confidenceLevel: "LOW",
      identificationConfidence: 0.3,
      needsReview: true,
    });
    const items = buildReviewItems([makePhoto([card])]);
    expect(items[0].includeInBatch).toBe(false);
    expect(items[0].card.selectedCandidateId).toBeNull();
  });

  it("defaults an UNIDENTIFIED card to unchecked", () => {
    const card = makeCard({
      identificationStatus: "unidentified",
      confidenceLevel: "UNIDENTIFIED",
      candidates: [],
      needsReview: true,
    });
    const items = buildReviewItems([makePhoto([card])]);
    expect(items[0].includeInBatch).toBe(false);
  });

  it("flattens multiple photos in order", () => {
    const photoA = makePhoto([makeCard({ detectedPosition: { index: 0 } })], "scan-a");
    const photoB = makePhoto([makeCard({ detectedPosition: { index: 0 } })], "scan-b");
    const items = buildReviewItems([photoA, photoB]);
    expect(items.map((i) => i.scanResultId)).toEqual(["scan-a", "scan-b"]);
  });
});

describe("setCandidate / skipItem / unskipItem", () => {
  it("selecting an already-offered candidate checks the item and clears needsReview", () => {
    const card = makeCard({ confidenceLevel: "MEDIUM", needsReview: true });
    const items = buildReviewItems([makePhoto([card])]);
    const next = setCandidate(items, items[0].key, card.candidates[0]);
    expect(next[0].includeInBatch).toBe(true);
    expect(next[0].card.selectedCandidateId).toBe(card.candidates[0].catalogItemId);
    expect(next[0].card.needsReview).toBe(false);
  });

  it("selecting a candidate NOT among the original offers still succeeds (Change card search result)", () => {
    const card = makeCard({ confidenceLevel: "LOW", needsReview: true });
    const items = buildReviewItems([makePhoto([card])]);
    const newCandidate = makeCandidate({ catalogItemId: "pokemon:base1-2", name: "Blastoise", number: "2" });
    const next = setCandidate(items, items[0].key, newCandidate);
    expect(next[0].card.selectedCandidateId).toBe("pokemon:base1-2");
    expect(next[0].card.candidates.some((c) => c.catalogItemId === "pokemon:base1-2")).toBe(true);
    expect(next[0].includeInBatch).toBe(true);
  });

  it("skip excludes an item, unskip restores its prior needsReview", () => {
    const card = makeCard({ confidenceLevel: "MEDIUM", needsReview: true });
    const items = buildReviewItems([makePhoto([card])]);
    const skipped = skipItem(items, items[0].key);
    expect(skipped[0].card.skipped).toBe(true);
    expect(skipped[0].includeInBatch).toBe(false);

    const unskipped = unskipItem(skipped, items[0].key);
    expect(unskipped[0].card.skipped).toBe(false);
    expect(unskipped[0].card.needsReview).toBe(true);
  });

  it("toggleInclude flips a HIGH-confidence item off and back on", () => {
    const items = buildReviewItems([makePhoto([makeCard()])]);
    expect(items[0].includeInBatch).toBe(true);
    const off = toggleInclude(items, items[0].key);
    expect(off[0].includeInBatch).toBe(false);
    const on = toggleInclude(off, items[0].key);
    expect(on[0].includeInBatch).toBe(true);
  });
});

describe("computeBatchSummary", () => {
  it("counts zero detected cards as all-zero", () => {
    expect(computeBatchSummary([])).toEqual({
      detected: 0,
      skipped: 0,
      highConfidence: 0,
      needsReview: 0,
      readyToCommit: 0,
      readyButNeedsReview: 0,
    });
  });

  it("reports high-confidence, needs-review, ready, and skipped counts", () => {
    const high = makeCard();
    const medium = makeCard({ confidenceLevel: "MEDIUM", needsReview: true });
    const toSkip = makeCard({ confidenceLevel: "LOW", needsReview: true });
    let items = buildReviewItems([makePhoto([high, medium, toSkip])]);
    // Explicitly confirm the medium card so it's ready-but-still-needsReview
    // (the "Add anyway" case) rather than just unchecked.
    items = setCandidate(items, items[1].key, medium.candidates[0]);
    // Force needsReview back on after selection to simulate a still-uncertain
    // manual confirmation the UI would gate behind "Add anyway".
    items = items.map((i, idx) => (idx === 1 ? { ...i, card: { ...i.card, needsReview: true } } : i));
    items = skipItem(items, items[2].key);

    const summary = computeBatchSummary(items);
    expect(summary.detected).toBe(3);
    expect(summary.skipped).toBe(1);
    expect(summary.highConfidence).toBe(1);
    expect(summary.readyToCommit).toBe(2);
    expect(summary.readyButNeedsReview).toBe(1);
  });
});

describe("toHoldingInputs", () => {
  it("maps only checked, non-skipped, candidate-selected items, one row per card", () => {
    const cards = [makeCard(), makeCard(), makeCard()];
    let items = buildReviewItems([makePhoto(cards)]);
    items = skipItem(items, items[2].key);

    const holdings = toHoldingInputs(items, defaults, makeId);
    expect(holdings).toHaveLength(2);
    expect(holdings.every((h) => h.quantity === 1)).toBe(true);
    expect(new Set(holdings.map((h) => h.id)).size).toBe(2);
    expect(holdings.every((h) => h.catalogItemId === "pokemon:base1-4")).toBe(true);
  });

  it("produces three separate holding rows for three duplicate scanned cards", () => {
    const cards = [makeCard(), makeCard(), makeCard()];
    const items = buildReviewItems([makePhoto(cards)]);
    const holdings = toHoldingInputs(items, defaults, makeId);
    expect(holdings).toHaveLength(3);
  });

  it("excludes items with no selected candidate", () => {
    const unresolved = makeCard({
      confidenceLevel: "LOW",
      needsReview: true,
    });
    const items = buildReviewItems([makePhoto([unresolved])]);
    const holdings = toHoldingInputs(items, defaults, makeId);
    expect(holdings).toHaveLength(0);
  });
});
