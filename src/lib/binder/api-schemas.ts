import { z } from "zod";

/** Shared zod validation for a BinderPocketRef (see types.ts) crossing the client/server boundary. */
export const pocketRefSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("holding"), holdingId: z.string().min(1) }),
  z.object({ kind: z.literal("catalog"), catalogItemId: z.string().min(1) }),
  // dataUrl is a base64 image — no length cap here beyond what Next's own
  // request-body limit enforces; this app has no blob storage to offload
  // it to (see BinderPage's schema.prisma doc comment).
  z.object({
    kind: z.literal("custom"),
    dataUrl: z.string().min(1),
    spanCols: z.number().int().positive().max(20),
    spanRows: z.number().int().positive().max(20),
  }),
  z.object({ kind: z.literal("custom-covered"), anchorSlotIndex: z.number().int().nonnegative() }),
]);

/** A page's full pocket array — one slot per BINDER_LAYOUTS pocket, in row-major order. 20-pocket is the largest layout today; capped well above that for headroom. */
export const pocketsSchema = z.array(pocketRefSchema.nullable()).max(64);

export const binderPageSchema = z.object({
  id: z.string().min(1),
  pockets: pocketsSchema,
});

// Hardcoded literal lists (not derived from BINDER_LAYOUTS/BINDER_COVER_COLORS
// at runtime) so z.enum infers the actual BinderLayoutId/BinderCoverColorId
// literal union instead of widening to `string` — TypeScript can't narrow a
// z.enum's type from a value produced by Object.keys/.map at the type level.
export const binderLayoutIdSchema = z.enum(["4", "6", "9", "12", "16", "20"]);
export const binderCoverColorIdSchema = z.enum([
  "black",
  "blue",
  "pink",
  "purple",
  "red",
  "yellow",
  "turquoise",
]);
export const pageBackgroundSchema = z.enum(["match-cover", "black", "white"]);
export const binderStatusSchema = z.enum(["wip", "live"]);

/** POST /api/binder — a full client-built Binder (createBinder always ships with exactly one empty page, same as the local store's defaultBinder/createBinder). */
export const createBinderSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  layoutId: binderLayoutIdSchema,
  coverColor: binderCoverColorIdSchema.optional(),
  pageBackground: pageBackgroundSchema.optional(),
  status: binderStatusSchema.optional(),
  pages: z.array(binderPageSchema).min(1).max(500),
});

/** PATCH /api/binder/[id] — a rename/coverColor/pageBackground/status/layout+pages patch; every field optional so one route covers all of Binder's simple setters. */
export const patchBinderSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  coverColor: binderCoverColorIdSchema.optional(),
  pageBackground: pageBackgroundSchema.optional(),
  status: binderStatusSchema.optional(),
  // layoutId + pages travel together: the client already ran reflowPages
  // client-side (see remote-store.ts) and sends the reflowed result to
  // persist — the server never re-derives it.
  layout: z
    .object({
      layoutId: binderLayoutIdSchema,
      pages: z.array(binderPageSchema).min(1).max(500),
    })
    .optional(),
});

/** POST /api/binder/[id]/pages — appends one empty page. */
export const addPageSchema = z.object({
  id: z.string().min(1),
  pockets: pocketsSchema,
});

/** DELETE /api/binder/[id]/pages/[pageId] — carries a client-generated replacement page when removing the binder's last page (mirrors the local store's "never let a binder go to zero pages" invariant). */
export const removePageSchema = z.object({
  fallbackPage: binderPageSchema.optional(),
});

/** PATCH /api/binder/[id]/pages/[pageId] — replaces one page's pockets wholesale; backs placeCard/placeCustomImage/removeHoldingEverywhere, which already compute the full next array client-side. */
export const patchPagePocketsSchema = z.object({
  pockets: pocketsSchema,
});

/** PATCH /api/binder/preferences — activeBinderId/showNumberTags/showNotOwnedTags, each optional. */
export const patchBinderPreferencesSchema = z.object({
  activeBinderId: z.string().min(1).optional(),
  showNumberTags: z.boolean().optional(),
  showNotOwnedTags: z.boolean().optional(),
});

/** POST /api/binder/import — a browser's whole local binder payload, upserted by client id. */
export const importBinderSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  layoutId: binderLayoutIdSchema,
  coverColor: binderCoverColorIdSchema,
  pageBackground: pageBackgroundSchema,
  status: binderStatusSchema,
  pages: z.array(binderPageSchema).min(1).max(500),
});
export const importBindersSchema = z.object({
  binders: z.array(importBinderSchema).max(50),
});
