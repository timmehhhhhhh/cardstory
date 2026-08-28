/**
 * Phase-1 stand-in OCRProvider — no OCR engine has been wired up yet (see
 * docs/cardvision.md's Phase 5). Returns an all-null OcrReading rather than
 * throwing, so a caller can always call `.read()` and get a well-formed
 * (if empty) result — same "explicit absence, not an error" convention as
 * null-embedding-provider.ts.
 */
import type { OcrReading } from "../types";
import type { OCRProvider } from "./types";

export const noopOcrProvider: OCRProvider = {
  id: "cardvision-noop-ocr",
  async read(): Promise<OcrReading> {
    return { name: null, collectorNumber: null, setNameOrSymbol: null, rawText: null };
  },
};
