-- CreateTable
CREATE TABLE "ebay_sold_price_snapshots" (
    "id" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedDate" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "query" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "medianPrice" DECIMAL(10,2),
    "avgPrice" DECIMAL(10,2),
    "minPrice" DECIMAL(10,2),
    "maxPrice" DECIMAL(10,2),
    "source" TEXT NOT NULL DEFAULT 'ebay-sold',

    CONSTRAINT "ebay_sold_price_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sports_card_ebay_sold_price_snapshots" (
    "id" TEXT NOT NULL,
    "sportsCardItemId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedDate" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "query" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "medianPrice" DECIMAL(10,2),
    "avgPrice" DECIMAL(10,2),
    "minPrice" DECIMAL(10,2),
    "maxPrice" DECIMAL(10,2),
    "source" TEXT NOT NULL DEFAULT 'ebay-sold',

    CONSTRAINT "sports_card_ebay_sold_price_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ebay_sold_price_snapshots_catalogItemId_capturedAt_idx" ON "ebay_sold_price_snapshots"("catalogItemId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ebay_sold_price_snapshots_catalogItemId_capturedDate_key" ON "ebay_sold_price_snapshots"("catalogItemId", "capturedDate");

-- CreateIndex
CREATE INDEX "sports_card_ebay_sold_price_snapshots_sportsCardItemId_capt_idx" ON "sports_card_ebay_sold_price_snapshots"("sportsCardItemId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "sports_card_ebay_sold_price_snapshots_sportsCardItemId_capt_key" ON "sports_card_ebay_sold_price_snapshots"("sportsCardItemId", "capturedDate");

-- AddForeignKey
ALTER TABLE "ebay_sold_price_snapshots" ADD CONSTRAINT "ebay_sold_price_snapshots_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "catalog_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sports_card_ebay_sold_price_snapshots" ADD CONSTRAINT "sports_card_ebay_sold_price_snapshots_sportsCardItemId_fkey" FOREIGN KEY ("sportsCardItemId") REFERENCES "sports_card_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
