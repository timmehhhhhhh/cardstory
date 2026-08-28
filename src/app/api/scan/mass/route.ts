import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { runScanPipelineSafe } from "@/lib/scanning";
import { getDefaultIdentificationStrategy } from "@/lib/scanning/identify";
import { createMemoizedIdentificationStrategy } from "@/lib/scan-cards/memoized-identification";

const bodySchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.string().min(1).startsWith("image/"),
  imagePixelWidth: z.number().positive().optional(),
  imagePixelHeight: z.number().positive().optional(),
  gameHint: z.string().optional(),
});

/**
 * The Mass Card Scanner's per-photo detect+identify call — one request per
 * uploaded/captured photo (see src/app/scan/_components/scan-client.tsx,
 * which fires these in parallel via Promise.allSettled). Thin: all the
 * actual work is `runScanPipelineSafe` from the shared scanning engine
 * (src/lib/scanning) — this route exists only to keep GEMINI_API_KEY
 * server-side and to supply a request-scoped memoizing identification
 * strategy (see memoized-identification.ts) so a photo with several
 * detected cards doesn't fire duplicate Gemini/catalog lookups for what the
 * current stub ImageProcessor makes byte-identical crops.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid image" }, { status: 400 });

  const { imageBase64, mimeType, imagePixelWidth, imagePixelHeight, gameHint } = parsed.data;

  const result = await runScanPipelineSafe({
    image: { kind: "inline", base64: imageBase64, mimeType },
    imagePixelWidth,
    imagePixelHeight,
    gameHint,
    identificationStrategy: createMemoizedIdentificationStrategy(getDefaultIdentificationStrategy()),
  });

  return NextResponse.json(result);
}
