import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { identifyCardFromImage } from "@/lib/scan/gemini";
import { matchCandidates } from "@/lib/scan/match";

const bodySchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.string().min(1),
});

// Keep the AI vision key server-side only; never sent to the client.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing image" }, { status: 400 });
  }

  let identification;
  try {
    identification = await identifyCardFromImage(parsed.data.imageBase64, parsed.data.mimeType);
  } catch (err) {
    console.error("Gemini scan failed:", err);
    identification = null;
  }

  if (!identification) {
    // No API key configured, or the call failed — graceful fallback to manual search.
    return NextResponse.json({ available: false, identification: null, candidates: [] });
  }

  if (!identification.cardName || identification.confidence < 0.15) {
    return NextResponse.json({ available: true, identification, candidates: [] });
  }

  const candidates = await matchCandidates(identification);
  return NextResponse.json({ available: true, identification, candidates });
}
