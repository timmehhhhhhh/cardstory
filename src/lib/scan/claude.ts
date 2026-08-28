// Card identification via Anthropic's Claude Messages API — see
// ai-provider.ts for the shared fetch/retry/error-classification plumbing
// and its comment on why this calls the REST API directly rather than the
// @anthropic-ai/sdk package.
import { MODEL, classifyAnthropicStatus, fetchAnthropicMessages } from "./ai-provider";

export interface ScanIdentification {
  gameGuess: "pokemon" | "other" | null;
  cardName: string | null;
  setNameOrSymbol: string | null;
  cardNumber: string | null;
  confidence: number;
}

// Forced tool use is Claude's reliable structured-output mechanism — unlike
// Gemini's `responseMimeType: "application/json"` + `responseSchema`, Claude
// has no free-text JSON mode to lean on, so the model is required to call
// this tool rather than asked to. Field names/shape mirror the app's
// existing ScanIdentification contract verbatim.
const IDENTIFY_TOOL = {
  name: "report_card_identification",
  description: "Report the identification of a single physical trading card visible in the photo.",
  input_schema: {
    type: "object",
    properties: {
      game_guess: {
        type: "string",
        enum: ["pokemon", "other"],
        description: "Which trading card game this card is from, best guess.",
      },
      card_name: {
        type: ["string", "null"],
        description: "The card's printed name, or null if no single trading card is clearly shown.",
      },
      set_name_or_symbol: {
        type: ["string", "null"],
        description: "The set name or set symbol text visible on the card, if legible.",
      },
      card_number: {
        type: ["string", "null"],
        description: "The collector number printed on the card (e.g. '054/165'), if visible.",
      },
      confidence: {
        type: "number",
        description: "0 to 1 confidence that card_name was read correctly.",
      },
    },
    required: ["game_guess", "card_name", "confidence"],
    additionalProperties: false,
  },
} as const;

const BASE_PROMPT = `You are identifying a single physical Pokémon trading card from a photo for a collector's cataloging app. Read the exact printed card name, the set name or set symbol, and the collector number if visible. If the photo doesn't clearly show a single trading card, set card_name to null and confidence to 0. Call report_card_identification with your findings — do not guess a name you cannot actually read on the card.`;

/**
 * Normalized ([0,1], relative to the full photo) region a caller wants this
 * read focused on — see `buildFocusClause` below for why this exists.
 */
export interface RegionHint {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Builds the focus clause appended to the user message when `regionHint` is
 * given. This exists for the Mass Card Scanner
 * (src/lib/scanning/identify/claude-identification.ts): that engine's
 * ImageProcessor doesn't actually crop yet (see server-image-processor.ts),
 * so every detected card in one photo is identified from the *same* full,
 * uncropped image — without a region hint, every card in a multi-card photo
 * would read identically.
 */
function buildFocusClause(regionHint?: RegionHint): string {
  if (!regionHint) return "";
  const left = Math.round(regionHint.x * 100);
  const top = Math.round(regionHint.y * 100);
  const right = Math.round((regionHint.x + regionHint.width) * 100);
  const bottom = Math.round((regionHint.y + regionHint.height) * 100);
  return ` This photo may contain other trading cards outside the area of interest — focus only on the card located at approximately ${left}-${right}% of the image's width and ${top}-${bottom}% of its height, and ignore any other cards elsewhere in the frame.`;
}

interface ToolUseBlock {
  type: "tool_use";
  name: string;
  input: unknown;
}

interface MessagesResponse {
  content?: ({ type: string } & Partial<ToolUseBlock>)[];
}

interface IdentifyToolInput {
  game_guess?: string;
  card_name?: string | null;
  set_name_or_symbol?: string | null;
  card_number?: string | null;
  confidence?: number;
}

function findToolUseInput(res: MessagesResponse, toolName: string): unknown | null {
  const block = res.content?.find((b): b is ToolUseBlock => b.type === "tool_use" && b.name === toolName);
  return block ? block.input : null;
}

/** Returns null if no API key is configured, or on any provider/parsing failure — callers treat this as "unidentified". */
export async function identifyCardFromImage(
  base64Image: string,
  mimeType: string,
  regionHint?: RegionHint
): Promise<ScanIdentification | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  let res: Response;
  try {
    res = await fetchAnthropicMessages(
      JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: BASE_PROMPT,
        tools: [IDENTIFY_TOOL],
        tool_choice: { type: "tool", name: IDENTIFY_TOOL.name },
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mimeType, data: base64Image } },
              { type: "text", text: `Identify this card.${buildFocusClause(regionHint)}` },
            ],
          },
        ],
      }),
      apiKey
    );
  } catch (err) {
    console.error("Claude messages request failed:", err);
    return null;
  }

  if (!res.ok) {
    const bodyText = await res.text();
    const code = classifyAnthropicStatus(res.status, bodyText);
    console.error("Claude messages call failed:", res.status, code, bodyText);
    return null;
  }

  const json = (await res.json()) as MessagesResponse;
  const input = findToolUseInput(json, IDENTIFY_TOOL.name) as IdentifyToolInput | null;
  if (!input) return null;

  return {
    gameGuess: input.game_guess === "pokemon" ? input.game_guess : "other",
    cardName: input.card_name ?? null,
    setNameOrSymbol: input.set_name_or_symbol ?? null,
    cardNumber: input.card_number ?? null,
    confidence: typeof input.confidence === "number" ? input.confidence : 0,
  };
}
