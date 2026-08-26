-- AlterTable
ALTER TABLE "catalog_items" ADD COLUMN     "nationalPokedexNumbers" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- CreateIndex
CREATE INDEX "catalog_items_nationalPokedexNumbers_idx" ON "catalog_items"("nationalPokedexNumbers");
