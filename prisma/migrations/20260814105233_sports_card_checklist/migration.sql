-- AlterTable
ALTER TABLE "sports_card_items" ADD COLUMN     "cardType" TEXT,
ADD COLUMN     "externalKey" TEXT,
ADD COLUMN     "imageBackUrl" TEXT,
ADD COLUMN     "sourceUrl" TEXT;

-- CreateTable
CREATE TABLE "sports_card_parallel_options" (
    "id" TEXT NOT NULL,
    "sportsCardItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serialLimit" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sports_card_parallel_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sports_card_parallel_options_sportsCardItemId_idx" ON "sports_card_parallel_options"("sportsCardItemId");

-- CreateIndex
CREATE UNIQUE INDEX "sports_card_items_externalKey_key" ON "sports_card_items"("externalKey");

-- AddForeignKey
ALTER TABLE "sports_card_parallel_options" ADD CONSTRAINT "sports_card_parallel_options_sportsCardItemId_fkey" FOREIGN KEY ("sportsCardItemId") REFERENCES "sports_card_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

