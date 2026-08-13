-- CreateEnum
CREATE TYPE "Sport" AS ENUM ('NBA', 'F1', 'UFC', 'TENNIS');

-- CreateTable
CREATE TABLE "sports_card_items" (
    "id" TEXT NOT NULL,
    "sport" "Sport" NOT NULL,
    "year" INTEGER,
    "setName" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "teamName" TEXT,
    "cardNumber" TEXT,
    "parallelName" TEXT,
    "isAutograph" BOOLEAN NOT NULL DEFAULT false,
    "isRelic" BOOLEAN NOT NULL DEFAULT false,
    "serialNumber" TEXT,
    "serialLimit" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priceChartingId" TEXT,
    "latestPriceRaw" DECIMAL(10,2),
    "latestPriceDate" TEXT,
    "prevPriceRaw" DECIMAL(10,2),
    "priceChangePct" DOUBLE PRECISION,

    CONSTRAINT "sports_card_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sports_card_price_snapshots" (
    "id" TEXT NOT NULL,
    "sportsCardItemId" TEXT NOT NULL,
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
    "source" TEXT NOT NULL DEFAULT 'sportscardspro',

    CONSTRAINT "sports_card_price_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sports_card_items_priceChartingId_key" ON "sports_card_items"("priceChartingId");

-- CreateIndex
CREATE INDEX "sports_card_items_sport_idx" ON "sports_card_items"("sport");

-- CreateIndex
CREATE INDEX "sports_card_items_playerName_idx" ON "sports_card_items"("playerName");

-- CreateIndex
CREATE INDEX "sports_card_price_snapshots_sportsCardItemId_capturedAt_idx" ON "sports_card_price_snapshots"("sportsCardItemId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "sports_card_price_snapshots_sportsCardItemId_capturedDate_key" ON "sports_card_price_snapshots"("sportsCardItemId", "capturedDate");

-- AddForeignKey
ALTER TABLE "sports_card_price_snapshots" ADD CONSTRAINT "sports_card_price_snapshots_sportsCardItemId_fkey" FOREIGN KEY ("sportsCardItemId") REFERENCES "sports_card_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
