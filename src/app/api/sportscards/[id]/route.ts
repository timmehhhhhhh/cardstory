import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateSportsCardImage } from "@/lib/sportscards/manage";

// Generous but bounded — images are typically client-resized data URLs
// (see AddImageDialog), so this just guards against something pathological.
const MAX_IMAGE_URL_LENGTH = 2_000_000;

const bodySchema = z.object({
  imageUrl: z.string().min(1).max(MAX_IMAGE_URL_LENGTH),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid image" }, { status: 400 });
  }

  const updated = await updateSportsCardImage(id, parsed.data.imageUrl);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ item: updated });
}
