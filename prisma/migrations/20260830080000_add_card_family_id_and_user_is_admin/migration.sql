-- Backfills a migration that was never generated when `CatalogItem.cardFamilyId`
-- and `User.isAdmin` were added to prisma/schema.prisma (commit da46941,
-- "Add card variants, curated-set focus toggle, PC group collapse, 3-wide
-- gallery"). Neither column ever existed in the real database even though
-- `prisma migrate status` reported "up to date" (it only checks which
-- migration folders have been applied, not whether the live schema actually
-- matches prisma/schema.prisma) — confirmed via `prisma migrate diff` against
-- production. Every `catalogItem.findUnique`/`findMany` call that doesn't
-- explicitly `select` its columns (e.g. the card detail page's full-row
-- lookup) implicitly selects `cardFamilyId` too, so this silently 500'd on
-- every single card detail page in production, not just Pokémon promo cards.
-- Both new columns are nullable/defaulted, so this is a purely additive,
-- zero-downtime change.

-- AlterTable
ALTER TABLE "catalog_items" ADD COLUMN     "cardFamilyId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "catalog_items_cardFamilyId_idx" ON "catalog_items"("cardFamilyId");
