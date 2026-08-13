-- AlterTable
ALTER TABLE "catalog_items" ADD COLUMN     "latestPriceDate" TEXT,
ADD COLUMN     "latestPriceFoil" DECIMAL(10,2),
ADD COLUMN     "latestPriceRaw" DECIMAL(10,2),
ADD COLUMN     "prevPriceRaw" DECIMAL(10,2),
ADD COLUMN     "priceChangePct" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "catalog_items_latestPriceRaw_idx" ON "catalog_items"("latestPriceRaw");

-- CreateIndex
CREATE INDEX "catalog_items_priceChangePct_idx" ON "catalog_items"("priceChangePct");
