// Calls Gemini's generateContent REST endpoint directly, the same
// Workers-bundle-size rationale as src/lib/scan/gemini.ts (avoids pulling
// the ~17MB @google/genai SDK into the single OpenNext Worker script for
// what amounts to one request/response call). This file intentionally
// duplicates that small amount of fetch/auth boilerplate (base URL, model
// alias, auth header) rather than importing from src/lib/scan/gemini.ts or
// refactoring it into a shared client: that file backs the existing,
// working single-card manual Scan feature and is treated as reuse-only for
// this phase, not a place to introduce a multi-card-shaped refactor.
//
// Unlike src/lib/scan/gemini.ts's single-card prompt/schema, this detector
// asks Gemini to locate every distinct card in the photo and return an
// array of normalized bounding boxes — Gemini's documented object-
// detection JSON-array response pattern.
import type { CardDetector, DetectionInput, DetectionRegion } from "./types";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "gemini-flash-latest";

const responseSchema = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      // Gemini's object-detection convention: [ymin, xmin, ymax, xmax],
      // each 0-1000 normalized to the image's shorter/longer edges. This
      // detector converts that into our own RawBox (x, y, width, height)
      // in [0,1] space below.
      box_2d: {
        type: "ARRAY",
        items: { type: "NUMBER" },
        description: "[ymin, xmin, ymax, xmax], each 0-1000.",
      },
      confidence: {
        type: "NUMBER",
        description: "0 to 1 confidence this region is a real physical trading card.",
      },
    },
    required: ["box_2d", "confidence"],
  },
};

const PROMPT = `You are locating physical trading cards in a photo for a collector's cataloging app. Find every distinct physical trading card visible — cards may be loose, sleeved, in binder pockets, at a slight angle, or partially overlapping. For each one, return its bounding box and your confidence it is really a trading card (not a binder page, table, hand, or other object). If no cards are visible, return an empty array. Do not treat every rectangle in the photo as a card — reject binder pockets, phone/table edges, phone cases, shadows or glare reflections, and other non-card rectangles. A card shown back-side-up (no artwork or printed name/text visible, just a uniform pattern) is still a real card — include it, but give it a lower confidence than a card whose front is legible, since it can't be identified from the back alone.`;

interface GenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

interface RawDetection {
  box_2d?: number[];
  confidence?: number;
}

// Gemini's free tier occasionally returns these for reasons that have
// nothing to do with the request itself (503 = model temporarily
// overloaded, 429 = rate limited) — worth a couple of short retries before
// giving up. Every other status (400 bad key/request, etc.) fails fast,
// since retrying those just wastes time on an error that won't change.
const RETRYABLE_STATUSES = new Set([429, 503]);
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 500;

async function fetchGenerateContentWithRetry(body: string, apiKey: string): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${GEMINI_API_BASE}/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body,
    });

    if (res.ok || !RETRYABLE_STATUSES.has(res.status) || attempt >= MAX_ATTEMPTS) return res;

    // Exponential backoff with jitter: ~500ms, ~1000ms.
    const delayMs = BASE_DELAY_MS * 2 ** (attempt - 1) + Math.random() * 250;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

/**
 * Returns null (not an empty array) when GEMINI_API_KEY is unset — the
 * same graceful-degradation convention as identifyCardFromImage, so
 * callers (see ./index.ts's getDefaultCardDetector) can distinguish
 * "provider not configured, use the fallback detector" from "provider ran
 * and found zero cards".
 */
export function createGeminiCardDetector(): CardDetector | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  return {
    id: "gemini-multi-region",
    async detect(input: DetectionInput): Promise<DetectionRegion[]> {
      if (input.image.kind !== "inline") {
        // This detector only ever sends image bytes to Gemini; an
        // "external" ImageRef (a URL the caller controls) isn't something
        // this implementation fetches on its own initiative.
        throw new Error("gemini-multi-region detector requires an inline ImageRef");
      }

      const res = await fetchGenerateContentWithRetry(
        JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: PROMPT },
                { inlineData: { mimeType: input.image.mimeType, data: input.image.base64 } },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema,
          },
        }),
        apiKey
      );

      if (!res.ok) {
        const bodyText = await res.text();
        // Full status/body goes to server logs for debugging — this error's
        // `message` is what ends up shown directly in the UI (see
        // pipeline.ts's runScanPipelineSafe, which surfaces a whole-run
        // failure's message verbatim as ScanResult.error), so it needs to
        // stay a short, human sentence rather than raw provider JSON.
        console.error("Gemini generateContent failed:", res.status, bodyText);
        throw new Error(
          RETRYABLE_STATUSES.has(res.status)
            ? "Card detection is busy right now — please try again in a moment."
            : "Card detection failed. Please try again."
        );
      }

      const json = (await res.json()) as GenerateContentResponse;
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return [];

      const parsed = JSON.parse(text) as RawDetection[];
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((d): d is Required<RawDetection> => Array.isArray(d.box_2d) && d.box_2d.length === 4)
        .map((d) => {
          const [ymin, xmin, ymax, xmax] = d.box_2d;
          return {
            box: {
              x: xmin / 1000,
              y: ymin / 1000,
              width: (xmax - xmin) / 1000,
              height: (ymax - ymin) / 1000,
            },
            confidence: typeof d.confidence === "number" ? d.confidence : 0,
          };
        });
    },
  };
}
