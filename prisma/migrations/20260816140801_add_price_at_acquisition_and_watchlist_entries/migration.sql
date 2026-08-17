-- AlterTable
ALTER TABLE "holdings" ADD COLUMN     "priceAtAcquisition" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "watchlist_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'tcg',
    "itemId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priceAtAdd" DECIMAL(10,2),

    CONSTRAINT "watchlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "watchlist_entries_userId_idx" ON "watchlist_entries"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_entries_userId_itemId_key" ON "watchlist_entries"("userId", "itemId");

-- AddForeignKey
ALTER TABLE "watchlist_entries" ADD CONSTRAINT "watchlist_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
