-- AlterTable
ALTER TABLE "catalog_items" ADD COLUMN     "cardType" TEXT;

-- CreateIndex
CREATE INDEX "catalog_items_cardType_idx" ON "catalog_items"("cardType");
