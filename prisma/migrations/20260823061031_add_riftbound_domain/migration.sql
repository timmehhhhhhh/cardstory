-- AlterTable
ALTER TABLE "catalog_items" ADD COLUMN     "domain" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "catalog_items_domain_idx" ON "catalog_items"("domain");
