import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";

/** Shared zod validation for a Holding crossing the client/server boundary. */
export const holdingInputSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["tcg", "sports"]).optional(),
  catalogItemId: z.string().optional(),
  sportsCardItemId: z.string().optional(),
  quantity: z.number().int().positive(),
  condition: z.enum(["raw", "graded"]),
  gradeCompany: z.string().optional(),
  gradeValue: z.string().optional(),
  serialNumber: z.string().optional(),
  language: z.enum(["EN", "JP", "CN", "TW", "KR"]),
  costBasisTotal: z.number().nonnegative(),
  costBasisCurrency: z.enum(SUPPORTED_CURRENCIES),
  priceAtAcquisition: z.number().nonnegative().nullable().optional(),
  acquiredAt: z.string(),
  notes: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const holdingPatchSchema = holdingInputSchema.omit({ id: true }).partial();

export const pcSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  createdAt: z.string(),
  holdings: z.array(holdingInputSchema).max(2000),
});

/** What a client actually sends to import — holdings need no createdAt/
 * updatedAt (the server assigns those via Prisma defaults on create). */
export type ImportPC = z.infer<typeof pcSchema>;
