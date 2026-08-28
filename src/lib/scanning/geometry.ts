/**
 * Pure bounding-box math and deterministic card ordering for the scanning
 * engine. No Gemini/Prisma/catalog imports — fully unit-testable in
 * isolation, and safe to call from any runtime (browser, Worker, Node).
 */
import type { BoundingBox } from "./types";

/** A detector-reported box before normalization — may be in pixel space, may have out-of-range or missing values. */
export interface RawBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/** Rounds an arbitrary rotation (degrees, any range) to the nearest quarter turn, normalized into [0, 360). */
function normalizeRotation(rotation: number | undefined): 0 | 90 | 180 | 270 {
  if (rotation == null || !Number.isFinite(rotation)) return 0;
  const mod = ((rotation % 360) + 360) % 360;
  const nearestQuarter = (Math.round(mod / 90) * 90) % 360;
  return nearestQuarter as 0 | 90 | 180 | 270;
}

/**
 * Clamps a possibly-out-of-range or pixel-space detector-reported box into
 * normalized [0,1] source-image-relative coordinates, and derives
 * centerX/centerY. Rotation is normalized to the nearest quarter-turn.
 *
 * When `imagePixelWidth`/`imagePixelHeight` are given AND the raw box looks
 * like pixel coordinates (any value > 1), the box is divided by the image
 * dimensions first. A detector that already reports normalized [0,1]
 * coordinates can omit the pixel dimensions entirely.
 */
export function normalizeBoundingBox(
  box: RawBox,
  imagePixelWidth?: number,
  imagePixelHeight?: number
): BoundingBox {
  const looksLikePixelSpace =
    (imagePixelWidth != null && imagePixelWidth > 0) ||
    (imagePixelHeight != null && imagePixelHeight > 0);
  const usesPixels =
    looksLikePixelSpace &&
    [box.x, box.y, box.width, box.height].some((v) => Number.isFinite(v) && Math.abs(v) > 1);

  const w = usesPixels && imagePixelWidth ? imagePixelWidth : 1;
  const h = usesPixels && imagePixelHeight ? imagePixelHeight : 1;

  const rawX = Number.isFinite(box.x) ? box.x : 0;
  const rawY = Number.isFinite(box.y) ? box.y : 0;
  const rawWidth = Number.isFinite(box.width) ? box.width : 0;
  const rawHeight = Number.isFinite(box.height) ? box.height : 0;

  const x = clamp01(rawX / w);
  const y = clamp01(rawY / h);
  // Clamp width/height so the box never extends past the image bounds.
  const width = clamp01(Math.max(0, Math.min(rawWidth / w, 1 - x)));
  const height = clamp01(Math.max(0, Math.min(rawHeight / h, 1 - y)));

  return {
    x,
    y,
    width,
    height,
    centerX: clamp01(x + width / 2),
    centerY: clamp01(y + height / 2),
    rotation: normalizeRotation(box.rotation),
  };
}

/** Ratio of intersection area over the smaller box's area — 1 for identical/nested boxes, 0 for disjoint boxes. Used to drop a detector's duplicate/nested boxes for the same physical card before identification runs. */
export function boxOverlapRatio(a: BoundingBox, b: BoundingBox): number {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;

  const interX = Math.max(0, Math.min(ax2, bx2) - Math.max(a.x, b.x));
  const interY = Math.max(0, Math.min(ay2, by2) - Math.max(a.y, b.y));
  const interArea = interX * interY;
  if (interArea <= 0) return 0;

  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  const smaller = Math.min(areaA, areaB);
  if (smaller <= 0) return 0;

  return clamp01(interArea / smaller);
}

/**
 * Assigns reading-order indices to a set of boxes: primarily by row (boxes
 * whose centerY are within `rowTolerance` of each other are treated as the
 * same row), then left-to-right within a row by centerX. Ties break by
 * original input index for determinism.
 *
 * Pure function of BoundingBox[] -> number[]: the returned array's i-th
 * entry is the reading-order index assigned to `boxes[i]`, so callers
 * derive `DetectedPosition.index` per box without this function mutating
 * or reordering the input array itself.
 */
export function orderCardsReadingOrder(boxes: BoundingBox[], rowTolerance = 0.08): number[] {
  const withOriginalIndex = boxes.map((box, originalIndex) => ({ box, originalIndex }));

  // Group into rows by scanning boxes sorted by centerY and starting a new
  // row whenever the gap from the running row's reference centerY exceeds
  // rowTolerance.
  const byCenterY = [...withOriginalIndex].sort((a, b) => a.box.centerY - b.box.centerY);

  const rows: { referenceCenterY: number; items: typeof withOriginalIndex }[] = [];
  for (const item of byCenterY) {
    const currentRow = rows[rows.length - 1];
    if (currentRow && Math.abs(item.box.centerY - currentRow.referenceCenterY) <= rowTolerance) {
      currentRow.items.push(item);
    } else {
      rows.push({ referenceCenterY: item.box.centerY, items: [item] });
    }
  }

  const readingOrder: { originalIndex: number }[] = [];
  for (const row of rows) {
    const sortedRow = [...row.items].sort((a, b) => {
      const dx = a.box.centerX - b.box.centerX;
      if (dx !== 0) return dx;
      // Stable tie-break for exactly-equal positions.
      return a.originalIndex - b.originalIndex;
    });
    readingOrder.push(...sortedRow);
  }

  const result = new Array<number>(boxes.length);
  readingOrder.forEach((item, readingIndex) => {
    result[item.originalIndex] = readingIndex;
  });
  return result;
}

/** One box's assigned position within a fixed rows x cols binder-page grid. */
export interface GridCell {
  row: number;
  col: number;
  /** Row-major index — `row * cols + col` — matching BinderPage.pockets' own indexing (see src/lib/binder/types.ts). */
  pocketIndex: number;
}

/**
 * Result of mapping a set of detected boxes onto a known rows x cols binder
 * grid. `cells[i]` corresponds to `boxes[i]`, always non-null (every box
 * lands in some clamped cell) — conflicts and gaps are reported separately
 * rather than by leaving entries null, so a caller never has to distinguish
 * "didn't map" from "mapped but reported elsewhere".
 */
export interface GridMappingResult {
  cells: GridCell[];
  /** Two or more boxes landed in the same pocketIndex — not auto-resolved; a reviewer decides which one wins. */
  conflicts: { pocketIndex: number; boxIndices: number[] }[];
  /** pocketIndex values (0..rows*cols-1) no box landed in — these pockets must stay empty, never compacted. */
  unmappedPockets: number[];
}

/**
 * Maps detected card boxes onto a known rows x cols binder-page grid, using
 * pure geometry (centerX/centerY, already normalized to [0,1] by
 * normalizeBoundingBox) rather than detection order — the defining
 * requirement for Binder Import's spatial mapping (see AGENTS.md's "DO NOT
 * SORT ONLY BY DETECTION ORDER"). Each box's row/col is its normalized
 * center's position within an equal-band quantization of the page: row =
 * floor(centerY * rows), col = floor(centerX * cols), both clamped into
 * range. A center exactly on a band boundary rounds down to the
 * lower-index band (floor's own behavior) — deterministic, not a special
 * case.
 *
 * Calibration assumption (documented limitation — see AGENTS.md's "Known
 * limitations" in the final report): this assumes the photographed page
 * fills the frame edge-to-edge with evenly spaced pockets. There is no
 * separate page-boundary/perspective-corner detection step; whole-page
 * rotation (portrait/landscape/upside-down) is expected to be corrected
 * upstream (a manual rotate control in the capture UI) before the image is
 * ever sent to a detector, not compensated for here.
 */
export function mapCardsToGrid(boxes: BoundingBox[], rows: number, cols: number): GridMappingResult {
  const cells: GridCell[] = boxes.map((box) => {
    const row = Math.min(rows - 1, Math.max(0, Math.floor(box.centerY * rows)));
    const col = Math.min(cols - 1, Math.max(0, Math.floor(box.centerX * cols)));
    return { row, col, pocketIndex: row * cols + col };
  });

  const boxIndicesByPocket = new Map<number, number[]>();
  cells.forEach((cell, boxIndex) => {
    const existing = boxIndicesByPocket.get(cell.pocketIndex);
    if (existing) existing.push(boxIndex);
    else boxIndicesByPocket.set(cell.pocketIndex, [boxIndex]);
  });

  const conflicts = Array.from(boxIndicesByPocket.entries())
    .filter(([, boxIndices]) => boxIndices.length > 1)
    .map(([pocketIndex, boxIndices]) => ({ pocketIndex, boxIndices }));

  const unmappedPockets: number[] = [];
  for (let pocketIndex = 0; pocketIndex < rows * cols; pocketIndex++) {
    if (!boxIndicesByPocket.has(pocketIndex)) unmappedPockets.push(pocketIndex);
  }

  return { cells, conflicts, unmappedPockets };
}
