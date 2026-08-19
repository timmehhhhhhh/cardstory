import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";

const shortlistBaseFields = {
  kind: z.enum(["tcg", "sports", "custom"]),
  catalogItemId: z.string().optional(),
  sportsCardItemId: z.string().optional(),
  customName: z.string().min(1).max(200).optional(),
  customSubtitle: z.string().max(200).optional(),
  quantity: z.number().int().positive().max(999),
  askingPrice: z.number().nonnegative(),
  askingCurrency: z.enum(SUPPORTED_CURRENCIES),
  notes: z.string().max(500).optional(),
  source: z.string().max(200).optional(),
};

/**
 * The .refine below is the invariant that keeps a "custom" row from ever
 * arriving nameless — without it, a bad client payload could create a
 * shortlist item with nothing to render in place of a name.
 */
export const shortlistItemSchema = z
  .object({
    // Client-generated (crypto.randomUUID()), same convention as
    // createPC/createView — lets the caller show the new row immediately
    // without waiting on the network.
    id: z.string().min(1),
    ...shortlistBaseFields,
  })
  .refine(
    (d) =>
      d.kind === "tcg"
        ? !!d.catalogItemId
        : d.kind === "sports"
          ? !!d.sportsCardItemId
          : !!d.customName,
    { message: "Item is missing its identifying field for this kind" }
  );
export type ShortlistItemInput = z.infer<typeof shortlistItemSchema>;

export const shortlistPatchSchema = z
  .object(shortlistBaseFields)
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "Nothing to update" });
export type ShortlistItemPatchInput = z.infer<typeof shortlistPatchSchema>;

export const shortlistRemoveSchema = z.object({
  itemIds: z.array(z.string().min(1)).min(1).max(200),
});
