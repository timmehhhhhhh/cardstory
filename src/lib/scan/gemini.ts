// Calls Gemini's generateContent REST endpoint directly rather than via the
// @google/genai SDK — the SDK pulls in ~17MB of node_modules (streaming,
// Vertex AI, batch/fine-tuning, auth strategies, ...) for what this file
// only ever uses as a single request/response call, and OpenNext bundles
// the whole thing into the single Worker script regardless of whether Scan
// is used. See the Cloudflare free-tier 3 MiB Worker size cap this app
// deploys under (wrangler.jsonc) — this alone was a meaningful chunk of it.
// Endpoint/request shape confirmed against the SDK's own compiled output
// (node_modules/@google/genai/dist/node/index.mjs): base URL, `v1beta`
// default API version, `{model}:generateContent` path, `x-goog-api-key`
// auth header, and `config` -> REST `generationConfig` field mapping.
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL =
  // Alias Google keeps pointed at their current recommended flash model —
  // pinning to a dated model name (e.g. "gemini-2.0-flash") risks it being
  // retired later, as happened during this build.
  "gemini-flash-latest";

export interface ScanIdentification {
  gameGuess: "pokemon" | "other" | null;
  cardName: string | null;
  setNameOrSymbol: string | null;
  cardNumber: string | null;
  confidence: number;
}

// Matches the SDK's Type enum values (Type.OBJECT === "OBJECT", etc.) —
// those are just the OpenAPI schema type strings the REST API expects
// directly, so no translation layer is needed.
const responseSchema = {
  type: "OBJECT",
  properties: {
    game_guess: {
      type: "STRING",
      enum: ["pokemon", "other"],
      description: "Which trading card game this card is from, best guess.",
    },
    card_name: { type: "STRING", description: "The card's printed name." },
    set_name_or_symbol: {
      type: "STRING",
      description: "The set name or set symbol text visible on the card, if legible.",
    },
    card_number: {
      type: "STRING",
      description: "The collector number printed on the card (e.g. '054/165'), if visible.",
    },
    confidence: {
      type: "NUMBER",
      description: "0 to 1 confidence that card_name was read correctly.",
    },
  },
  required: ["game_guess", "card_name", "confidence"],
};

const BASE_PROMPT = `You are identifying a single physical Pokémon trading card from a photo for a collector's cataloging app. Read the exact printed card name, the set name or set symbol, and the collector number if visible. If the photo doesn't clearly show a single trading card, set card_name to null and confidence to 0.`;

/**
 * Normalized ([0,1], relative to the full photo) region a caller wants this
 * read focused on — see `buildPrompt` below for why this exists.
 */
export interface RegionHint {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Appends a focus clause when `regionHint` is given. This exists for the
 * Mass Card Scanner (src/lib/scanning/identify/gemini-identification.ts):
 * that engine's ImageProcessor doesn't actually crop yet (see
 * server-image-processor.ts), so every detected card in one photo is
 * identified from the *same* full, uncropped image — without a region hint,
 * every card in a multi-card photo would read identically. The single-card
 * manual Scan feature never passes a hint, so its prompt is unchanged.
 */
function buildPrompt(regionHint?: RegionHint): string {
  if (!regionHint) return BASE_PROMPT;
  const left = Math.round(regionHint.x * 100);
  const top = Math.round(regionHint.y * 100);
  const right = Math.round((regionHint.x + regionHint.width) * 100);
  const bottom = Math.round((regionHint.y + regionHint.height) * 100);
  return `${BASE_PROMPT} This photo may contain other trading cards outside the area of interest — focus only on the card located at approximately ${left}-${right}% of the image's width and ${top}-${bottom}% of its height, and ignore any other cards elsewhere in the frame.`;
}

interface GenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
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

/** Returns null if no API key is configured — callers must fall back to manual search. */
export async function identifyCardFromImage(
  base64Image: string,
  mimeType: string,
  regionHint?: RegionHint
): Promise<ScanIdentification | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const res = await fetchGenerateContentWithRetry(
    JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: buildPrompt(regionHint) }, { inlineData: { mimeType, data: base64Image } }],
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
    console.error("Gemini generateContent failed:", res.status, await res.text());
    return null;
  }

  const json = (await res.json()) as GenerateContentResponse;
  // The SDK's `response.text` getter just concatenates the text parts of
  // the first candidate — with a single-turn, non-streaming call like this
  // one there's only ever one part to read.
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  const parsed = JSON.parse(text) as {
    game_guess?: string;
    card_name?: string | null;
    set_name_or_symbol?: string | null;
    card_number?: string | null;
    confidence?: number;
  };

  return {
    gameGuess: parsed.game_guess === "pokemon" ? parsed.game_guess : "other",
    cardName: parsed.card_name ?? null,
    setNameOrSymbol: parsed.set_name_or_symbol ?? null,
    cardNumber: parsed.card_number ?? null,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
  };
}
