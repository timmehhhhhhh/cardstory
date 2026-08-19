-- AlterTable
ALTER TABLE "sets" ADD COLUMN     "nameEn" TEXT;

-- CreateIndex
CREATE INDEX "sets_nameEn_idx" ON "sets"("nameEn");
