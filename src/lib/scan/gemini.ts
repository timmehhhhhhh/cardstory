import { GoogleGenAI, Type } from "@google/genai";

export interface ScanIdentification {
  gameGuess: "pokemon" | "mtg" | "other" | null;
  cardName: string | null;
  setNameOrSymbol: string | null;
  cardNumber: string | null;
  confidence: number;
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    game_guess: {
      type: Type.STRING,
      enum: ["pokemon", "mtg", "other"],
      description: "Which trading card game this card is from, best guess.",
    },
    card_name: { type: Type.STRING, description: "The card's printed name." },
    set_name_or_symbol: {
      type: Type.STRING,
      description: "The set name or set symbol text visible on the card, if legible.",
    },
    card_number: {
      type: Type.STRING,
      description: "The collector number printed on the card (e.g. '054/165'), if visible.",
    },
    confidence: {
      type: Type.NUMBER,
      description: "0 to 1 confidence that card_name was read correctly.",
    },
  },
  required: ["game_guess", "card_name", "confidence"],
};

const PROMPT = `You are identifying a single physical trading card (Pokémon or Magic: The Gathering) from a photo for a collector's cataloging app. Read the exact printed card name, the set name or set symbol, and the collector number if visible. If the photo doesn't clearly show a single trading card, set card_name to null and confidence to 0.`;

/** Returns null if no API key is configured — callers must fall back to manual search. */
export async function identifyCardFromImage(
  base64Image: string,
  mimeType: string
): Promise<ScanIdentification | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    // Alias Google keeps pointed at their current recommended flash model —
    // pinning to a dated model name (e.g. "gemini-2.0-flash") risks it
    // being retired later, as happened during this build.
    model: "gemini-flash-latest",
    contents: [
      {
        role: "user",
        parts: [{ text: PROMPT }, { inlineData: { mimeType, data: base64Image } }],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const text = response.text;
  if (!text) return null;

  const parsed = JSON.parse(text) as {
    game_guess?: string;
    card_name?: string | null;
    set_name_or_symbol?: string | null;
    card_number?: string | null;
    confidence?: number;
  };

  return {
    gameGuess:
      parsed.game_guess === "pokemon" || parsed.game_guess === "mtg" ? parsed.game_guess : "other",
    cardName: parsed.card_name ?? null,
    setNameOrSymbol: parsed.set_name_or_symbol ?? null,
    cardNumber: parsed.card_number ?? null,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
  };
}
