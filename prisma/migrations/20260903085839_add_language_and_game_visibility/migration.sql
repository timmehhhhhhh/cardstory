-- AlterTable
ALTER TABLE "users" ADD COLUMN     "hiddenGameIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "visibleLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[];
