import { z } from "zod";
import { SUPPORTED_CURRENCIES, CARD_CONDITIONS, LET_GO_METHODS } from "@/lib/constants";

/** Shared zod validation for a Holding crossing the client/server boundary. */
export const holdingInputSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["tcg", "sports"]).optional(),
  catalogItemId: z.string().optional(),
  sportsCardItemId: z.string().optional(),
  /** Only set when neither id above is — a card the user keyed in by hand. */
  customName: z.string().max(200).optional(),
  /** Positive and capped at 20 — a single holding can't be added/edited past 20x the same card in one go. */
  quantity: z.number().int().positive().max(20),
  condition: z.enum(["raw", "graded"]),
  gradeCompany: z.string().optional(),
  gradeValue: z.string().optional(),
  rawCondition: z.enum(CARD_CONDITIONS).optional(),
  serialNumber: z.string().optional(),
  language: z.enum(["EN", "JP", "CN", "TW", "KR"]),
  costBasisTotal: z.number().nonnegative(),
  costBasisCurrency: z.enum(SUPPORTED_CURRENCIES),
  priceAtAcquisition: z.number().nonnegative().nullable().optional(),
  acquiredAt: z.string().nullable(),
  notes: z.string().optional(),
  imageUrl: z.string().optional(),
  archivedAt: z.string().nullable().optional(),
  letGoAt: z.string().nullable().optional(),
  letGoMethod: z.enum(LET_GO_METHODS).optional(),
  letGoTo: z.string().max(200).optional(),
  letGoAmount: z.number().nonnegative().nullable().optional(),
  letGoCurrency: z.enum(SUPPORTED_CURRENCIES).optional(),
  letGoNotes: z.string().max(1000).optional(),
});

export const holdingPatchSchema = holdingInputSchema.omit({ id: true }).partial();

/** Optional "how this card left the collection" details captured when archiving — see POST /api/pc/holdings/archive. */
export const letGoDetailsSchema = z.object({
  letGoAt: z.string().nullable().optional(),
  letGoMethod: z.enum(LET_GO_METHODS).optional(),
  letGoTo: z.string().max(200).optional(),
  letGoAmount: z.number().nonnegative().nullable().optional(),
  letGoCurrency: z.enum(SUPPORTED_CURRENCIES).optional(),
  letGoNotes: z.string().max(1000).optional(),
});

export const archiveHoldingsSchema = z.object({
  pcId: z.string().min(1),
  holdingIds: z.array(z.string()).min(1),
  letGo: letGoDetailsSchema.optional(),
});
export type LetGoDetails = z.infer<typeof letGoDetailsSchema>;

export const pcSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  createdAt: z.string(),
  holdings: z.array(holdingInputSchema).max(2000),
});

/** What a client actually sends to import — holdings need no createdAt/
 * updatedAt (the server assigns those via Prisma defaults on create). */
export type ImportPC = z.infer<typeof pcSchema>;
