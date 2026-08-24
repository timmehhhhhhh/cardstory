import { z } from "zod";
import { CATALOG_SORTS } from "@/lib/catalog/search";

export const viewFiltersSchema = z.object({
  q: z.string().max(200).default(""),
  game: z.string().max(60).default("all"),
  set: z.string().max(120).default(""),
  type: z.enum(["all", "CARD", "SEALED"]).default("all"),
  cardTypes: z.array(z.string().min(1).max(80)).max(50).default([]),
  rarities: z.array(z.string().min(1).max(80)).max(50).default([]),
  domains: z.array(z.string().min(1).max(40)).max(10).default([]),
  languages: z.array(z.enum(["EN", "JP", "CN", "TW", "KR"])).max(5).default([]),
  artists: z.array(z.string().min(1).max(100)).max(25).default([]),
  baseOnly: z.boolean().default(true),
  sort: z.enum(CATALOG_SORTS).default("best_match"),
});
export type ViewFiltersInput = z.infer<typeof viewFiltersSchema>;

export const createViewSchema = z.object({
  // Client-generated (crypto.randomUUID()), same convention as
  // createPC's id in src/app/api/pc/route.ts — lets the caller get a
  // synchronous id back for optimistic UI without waiting on the network.
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  filters: viewFiltersSchema,
});
export type CreateViewInput = z.infer<typeof createViewSchema>;

export const patchViewSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    filters: viewFiltersSchema.optional(),
  })
  .refine((d) => d.name !== undefined || d.filters !== undefined, {
    message: "Nothing to update",
  });
export type PatchViewInput = z.infer<typeof patchViewSchema>;
