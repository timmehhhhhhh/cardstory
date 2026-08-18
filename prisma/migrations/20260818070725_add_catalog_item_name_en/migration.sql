-- AlterTable
ALTER TABLE "catalog_items" ADD COLUMN     "nameEn" TEXT;

-- CreateIndex
CREATE INDEX "catalog_items_nameEn_idx" ON "catalog_items"("nameEn");
