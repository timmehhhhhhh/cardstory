-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('WIRED', 'COMING_SOON');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('CARD', 'SEALED');

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'COMING_SOON',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sets" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "releaseDate" TIMESTAMP(3),
    "symbolUrl" TEXT,
    "cardCount" INTEGER,

    CONSTRAINT "sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_items" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" TEXT,
    "rarity" TEXT,
    "imageSmallUrl" TEXT,
    "imageLargeUrl" TEXT,
    "productType" "ProductType" NOT NULL DEFAULT 'CARD',
    "language" TEXT NOT NULL DEFAULT 'EN',
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_snapshots" (
    "id" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedDate" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "priceRaw" DECIMAL(10,2),
    "priceFoil" DECIMAL(10,2),
    "source" TEXT NOT NULL,

    CONSTRAINT "price_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "showcase_snapshots" (
    "id" TEXT NOT NULL,
    "ownerToken" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "showcase_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sets_gameId_idx" ON "sets"("gameId");

-- CreateIndex
CREATE INDEX "catalog_items_setId_idx" ON "catalog_items"("setId");

-- CreateIndex
CREATE INDEX "catalog_items_name_idx" ON "catalog_items"("name");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_items_gameId_externalId_key" ON "catalog_items"("gameId", "externalId");

-- CreateIndex
CREATE INDEX "price_snapshots_catalogItemId_capturedAt_idx" ON "price_snapshots"("catalogItemId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "price_snapshots_catalogItemId_capturedDate_key" ON "price_snapshots"("catalogItemId", "capturedDate");

-- AddForeignKey
ALTER TABLE "sets" ADD CONSTRAINT "sets_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_setId_fkey" FOREIGN KEY ("setId") REFERENCES "sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "catalog_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
