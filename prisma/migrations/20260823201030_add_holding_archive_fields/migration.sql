-- AlterTable
ALTER TABLE "holdings" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "letGoAmount" DECIMAL(10,2),
ADD COLUMN     "letGoAt" TIMESTAMP(3),
ADD COLUMN     "letGoCurrency" TEXT,
ADD COLUMN     "letGoMethod" TEXT,
ADD COLUMN     "letGoNotes" TEXT,
ADD COLUMN     "letGoTo" TEXT;
