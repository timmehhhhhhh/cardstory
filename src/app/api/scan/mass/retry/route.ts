import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getDefaultIdentificationStrategy } from "@/lib/scanning/identify";
import { classifyConfidence, computeNeedsReview } from "@/lib/scanning/confidence";
import type { CandidateMatch, ConfidenceLevel, IdentificationStatus } from "@/lib/scanning";

const imageRefSchema = z.union([
  z.object({ kind: z.literal("inline"), base64: z.string().min(1), mimeType: z.string().min(1) }),
  z.object({ kind: z.literal("external"), url: z.string().min(1), mimeType: z.string().min(1) }),
]);

const bodySchema = z.object({
  croppedImage: imageRefSchema,
  /** The card's original detection confidence — needed to recompute confidenceLevel the same way pipeline.ts does; this route only re-runs identification, not detection. */
  detectionConfidence: z.number().min(0).max(1),
  gameHint: z.string().optional(),
});

export interface RetryIdentifyResponse {
  identificationStatus: IdentificationStatus;
  identificationConfidence: number;
  candidates: CandidateMatch[];
  error: string | null;
  confidenceLevel: ConfidenceLevel;
  needsReview: boolean;
}

function computeTopCandidateSeparation(candidates: { score: number }[]): number {
  if (candidates.length === 0) return 0;
  if (candidates.length === 1) return candidates[0].score;
  return candidates[0].score - candidates[1].score;
}

/**
 * "Retry" for one already-detected card in the Mass Card Scanner's review
 * grid — re-runs identification only (via the shared engine's
 * IdentificationStrategy), for "the AI misread this, try again" on an
 * UNIDENTIFIED/error card. Mirrors src/lib/scanning/corrections.ts's
 * retryIdentification, but as a route (that function needs a live
 * IdentificationStrategy instance, which only exists server-side) and it
 * also recomputes confidenceLevel/needsReview the same way pipeline.ts does,
 * since corrections.ts's retryIdentification deliberately leaves those to
 * the caller.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { croppedImage, detectionConfidence, gameHint } = parsed.data;
  const strategy = getDefaultIdentificationStrategy();

  const output = await strategy.identify({ croppedImage, gameHint }).catch((err) => ({
    status: "error" as const,
    identificationConfidence: 0,
    candidates: [] as CandidateMatch[],
    error: err instanceof Error ? err.message : "Identification failed",
  }));

  const topCandidateSeparation = computeTopCandidateSeparation(output.candidates);
  const confidenceLevel = classifyConfidence({
    detectionConfidence,
    identificationConfidence: output.identificationConfidence,
    topCandidateSeparation,
    candidateCount: output.candidates.length,
  });
  const needsReview = computeNeedsReview(confidenceLevel, output.status);

  const response: RetryIdentifyResponse = {
    identificationStatus: output.status,
    identificationConfidence: output.identificationConfidence,
    candidates: output.candidates,
    error: output.error,
    confidenceLevel,
    needsReview,
  };
  return NextResponse.json(response);
}
