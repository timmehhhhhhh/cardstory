import { z } from "zod";

export const curatedSetFiltersSchema = z.object({
  games: z.array(z.string().min(1).max(60)).max(25).default([]),
  sets: z.array(z.string().min(1).max(120)).max(100).default([]),
  type: z.enum(["all", "CARD", "SEALED"]).default("all"),
  cardTypes: z.array(z.string().min(1).max(80)).max(50).default([]),
  rarities: z.array(z.string().min(1).max(80)).max(50).default([]),
  domains: z.array(z.string().min(1).max(40)).max(10).default([]),
  languages: z.array(z.enum(["EN", "JP", "CN", "TW", "KR"])).max(5).default([]),
  artists: z.array(z.string().min(1).max(100)).max(25).default([]),
  cardNames: z
    .array(z.object({ mode: z.enum(["is", "contains"]), value: z.string().min(1).max(200) }))
    .max(25)
    .default([]),
  variants: z.array(z.string().min(1).max(80)).max(50).default([]),
  baseOnly: z.boolean().default(true),
});
export type CuratedSetFiltersInput = z.infer<typeof curatedSetFiltersSchema>;

export const createCuratedSetSchema = z.object({
  // Client-generated (crypto.randomUUID()), same convention as
  // createView's id in src/lib/views/api-schemas.ts.
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  filters: curatedSetFiltersSchema,
  targetQuantity: z.number().int().min(1).max(20).default(1),
});
export type CreateCuratedSetInput = z.infer<typeof createCuratedSetSchema>;

export const patchCuratedSetSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    filters: curatedSetFiltersSchema.optional(),
    targetQuantity: z.number().int().min(1).max(20).optional(),
  })
  .refine((d) => d.name !== undefined || d.filters !== undefined || d.targetQuantity !== undefined, {
    message: "Nothing to update",
  });
export type PatchCuratedSetInput = z.infer<typeof patchCuratedSetSchema>;
