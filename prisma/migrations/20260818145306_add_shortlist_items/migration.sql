-- CreateTable
CREATE TABLE "shortlist_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'tcg',
    "catalogItemId" TEXT,
    "sportsCardItemId" TEXT,
    "customName" TEXT,
    "customSubtitle" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "askingPrice" DECIMAL(10,2) NOT NULL,
    "askingCurrency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shortlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shortlist_items_userId_addedAt_idx" ON "shortlist_items"("userId", "addedAt");

-- AddForeignKey
ALTER TABLE "shortlist_items" ADD CONSTRAINT "shortlist_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
