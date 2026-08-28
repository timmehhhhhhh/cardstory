// Multi-card detection via Anthropic's Claude Messages API — see
// src/lib/scan/ai-provider.ts for the shared fetch/retry/error-
// classification plumbing and its comment on why this calls the REST API
// directly rather than the @anthropic-ai/sdk package.
//
// Unlike src/lib/scan/claude.ts's single-card identification, this detector
// asks Claude to locate every distinct card in the photo and return an
// array of bounding boxes. Claude has no equivalent to Gemini's
// documented, specifically-trained `box_2d` object-detection grounding
// convention — box accuracy for multi-card/angled/overlapping photos should
// be verified against real photos, not assumed equivalent (see the
// migration plan's risk notes). The existing singleRegionDetector fallback
// remains available if this proves unreliable in practice.
import type { CardDetector, DetectionInput, DetectionRegion } from "./types";
import { MODEL, classifyAnthropicStatus, fetchAnthropicMessages, userSafeMessage } from "@/lib/scan/ai-provider";

// Tool `input_schema` must be a JSON Schema object (unlike Gemini's bare
// top-level ARRAY schema), so the detections array is wrapped in one. Boxes
// use named min/max fields rather than an unlabeled 4-number array —
// Gemini's [ymin,xmin,ymax,xmax] order is a Gemini-specific convention with
// no Claude equivalent; named fields remove any axis-order ambiguity by
// construction.
const DETECT_TOOL = {
  name: "report_card_detections",
  description: "Report every distinct physical trading card detected in the photo, as bounding boxes.",
  input_schema: {
    type: "object",
    properties: {
      detections: {
        type: "array",
        description: "One entry per detected card. Empty array if no cards are visible.",
        items: {
          type: "object",
          properties: {
            box: {
              type: "object",
              description: "Bounding box normalized to [0,1000] on both axes, origin top-left.",
              properties: {
                x_min: { type: "number" },
                y_min: { type: "number" },
                x_max: { type: "number" },
                y_max: { type: "number" },
              },
              required: ["x_min", "y_min", "x_max", "y_max"],
              additionalProperties: false,
            },
            confidence: {
              type: "number",
              description: "0 to 1 confidence this region is a real physical trading card.",
            },
          },
          required: ["box", "confidence"],
          additionalProperties: false,
        },
      },
    },
    required: ["detections"],
    additionalProperties: false,
  },
} as const;

const PROMPT = `You are locating physical trading cards in a photo for a collector's cataloging app. Find every distinct physical trading card visible — cards may be loose, sleeved, in binder pockets, at a slight angle, or partially overlapping. For each one, report a bounding box (x_min, y_min, x_max, y_max, each 0-1000, origin top-left) and your confidence it is really a trading card (not a binder page, table, hand, or other object). If no cards are visible, call report_card_detections with an empty detections array. Do not treat every rectangle in the photo as a card — reject binder pockets, phone/table edges, phone cases, shadows or glare reflections, and other non-card rectangles. A card shown back-side-up (no artwork or printed name/text visible, just a uniform pattern) is still a real card — include it, but give it a lower confidence than a card whose front is legible, since it can't be identified from the back alone.`;

interface ToolUseBlock {
  type: "tool_use";
  name: string;
  input: unknown;
}

interface MessagesResponse {
  content?: ({ type: string } & Partial<ToolUseBlock>)[];
}

interface RawDetection {
  box?: { x_min?: number; y_min?: number; x_max?: number; y_max?: number };
  confidence?: number;
}

interface DetectToolInput {
  detections?: RawDetection[];
}

function findToolUseInput(res: MessagesResponse, toolName: string): unknown | null {
  const block = res.content?.find((b): b is ToolUseBlock => b.type === "tool_use" && b.name === toolName);
  return block ? block.input : null;
}

/**
 * Returns null (not an empty array) when ANTHROPIC_API_KEY is unset — the
 * same graceful-degradation convention as identifyCardFromImage, so callers
 * (see ./index.ts's getDefaultCardDetector) can distinguish "provider not
 * configured, use the fallback detector" from "provider ran and found zero
 * cards".
 */
export function createClaudeCardDetector(): CardDetector | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  return {
    id: "claude-multi-region",
    async detect(input: DetectionInput): Promise<DetectionRegion[]> {
      if (input.image.kind !== "inline") {
        // This detector only ever sends image bytes to Claude; an
        // "external" ImageRef (a URL the caller controls) isn't something
        // this implementation fetches on its own initiative.
        throw new Error("claude-multi-region detector requires an inline ImageRef");
      }

      let res: Response;
      try {
        res = await fetchAnthropicMessages(
          JSON.stringify({
            model: MODEL,
            max_tokens: 4096,
            system: PROMPT,
            tools: [DETECT_TOOL],
            tool_choice: { type: "tool", name: DETECT_TOOL.name },
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "image",
                    source: { type: "base64", media_type: input.image.mimeType, data: input.image.base64 },
                  },
                  { type: "text", text: "Locate every card in this photo." },
                ],
              },
            ],
          }),
          apiKey
        );
      } catch (err) {
        console.error("Claude messages request failed:", err);
        throw new Error(userSafeMessage("AI_PROVIDER_UNAVAILABLE"));
      }

      if (!res.ok) {
        const bodyText = await res.text();
        const code = classifyAnthropicStatus(res.status, bodyText);
        // Full status/body/code goes to server logs for debugging — the
        // thrown error's message is what ends up shown directly in the UI
        // (see pipeline.ts's runScanPipelineSafe, which surfaces a
        // whole-run failure's message verbatim as ScanResult.error), so it
        // needs to stay a short, human sentence rather than raw provider JSON.
        console.error("Claude messages call failed:", res.status, code, bodyText);
        throw new Error(userSafeMessage(code));
      }

      const json = (await res.json()) as MessagesResponse;
      const toolInput = findToolUseInput(json, DETECT_TOOL.name) as DetectToolInput | null;
      const detections = toolInput?.detections;
      if (!Array.isArray(detections)) return [];

      return detections
        .filter(
          (d): d is Required<RawDetection> & { box: Required<NonNullable<RawDetection["box"]>> } =>
            d.box != null &&
            typeof d.box.x_min === "number" &&
            typeof d.box.y_min === "number" &&
            typeof d.box.x_max === "number" &&
            typeof d.box.y_max === "number"
        )
        .map((d) => ({
          box: {
            x: d.box.x_min / 1000,
            y: d.box.y_min / 1000,
            width: (d.box.x_max - d.box.x_min) / 1000,
            height: (d.box.y_max - d.box.y_min) / 1000,
          },
          confidence: typeof d.confidence === "number" ? d.confidence : 0,
        }));
    },
  };
}
