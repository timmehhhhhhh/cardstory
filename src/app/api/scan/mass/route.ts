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
  /**
   * Additive, optional cap on how many detected regions get identified —
   * defaults to runScanPipelineSafe's own DEFAULT_MAX_CARDS (20) when
   * omitted. Physical Binder Import (src/app/binder/import) passes the
   * target binder page's own pocketCount(layoutId) so a busy page never
   * silently drops a card past the default cap; Mass Scanner leaves this
   * unset. Capped at 20 here to match BINDER_LAYOUTS' current largest
   * layout (see src/lib/binder/types.ts) and to keep one photo's
   * identification cost bounded.
   */
  maxCards: z.number().int().positive().max(20).optional(),
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

  const { imageBase64, mimeType, imagePixelWidth, imagePixelHeight, gameHint, maxCards } = parsed.data;

  const result = await runScanPipelineSafe({
    image: { kind: "inline", base64: imageBase64, mimeType },
    imagePixelWidth,
    imagePixelHeight,
    gameHint,
    maxCards,
    identificationStrategy: createMemoizedIdentificationStrategy(getDefaultIdentificationStrategy()),
  });

  return NextResponse.json(result);
}
