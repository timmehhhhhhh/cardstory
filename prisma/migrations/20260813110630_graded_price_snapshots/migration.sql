-- AlterTable
ALTER TABLE "catalog_items" ADD COLUMN     "priceChartingId" TEXT;

-- CreateTable
CREATE TABLE "graded_price_snapshots" (
    "id" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedDate" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "loosePrice" DECIMAL(10,2),
    "grade7Price" DECIMAL(10,2),
    "grade8Price" DECIMAL(10,2),
    "grade9Price" DECIMAL(10,2),
    "grade95Price" DECIMAL(10,2),
    "psa10Price" DECIMAL(10,2),
    "cgc10Price" DECIMAL(10,2),
    "sgc10Price" DECIMAL(10,2),
    "bgs10Price" DECIMAL(10,2),
    "source" TEXT NOT NULL DEFAULT 'pricecharting',

    CONSTRAINT "graded_price_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "graded_price_snapshots_catalogItemId_capturedAt_idx" ON "graded_price_snapshots"("catalogItemId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "graded_price_snapshots_catalogItemId_capturedDate_key" ON "graded_price_snapshots"("catalogItemId", "capturedDate");

-- AddForeignKey
ALTER TABLE "graded_price_snapshots" ADD CONSTRAINT "graded_price_snapshots_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "catalog_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
