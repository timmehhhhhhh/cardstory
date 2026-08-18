-- DropIndex
DROP INDEX "catalog_items_gameId_externalId_key";

-- AlterTable
ALTER TABLE "catalog_items" ADD COLUMN     "variantKey" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "catalog_items_gameId_externalId_idx" ON "catalog_items"("gameId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_items_gameId_externalId_variantKey_key" ON "catalog_items"("gameId", "externalId", "variantKey");
