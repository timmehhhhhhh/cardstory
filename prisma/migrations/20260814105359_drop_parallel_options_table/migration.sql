-- DropForeignKey
ALTER TABLE "sports_card_parallel_options" DROP CONSTRAINT "sports_card_parallel_options_sportsCardItemId_fkey";

-- DropTable
DROP TABLE "sports_card_parallel_options";

-- CreateIndex
CREATE INDEX "sports_card_items_cardType_idx" ON "sports_card_items"("cardType");

