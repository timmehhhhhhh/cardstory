import { z } from "zod";

/** Shared zod validation for a WatchlistEntry crossing the client/server boundary. */
export const watchlistAddSchema = z.object({
  itemId: z.string().min(1),
  kind: z.enum(["tcg", "sports"]),
  priceAtAdd: z.number().nonnegative().nullable().optional(),
});

export const watchlistRemoveSchema = z.object({ itemId: z.string().min(1) });
