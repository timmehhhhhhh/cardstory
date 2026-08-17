-- AlterTable
ALTER TABLE "portfolios" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'personal';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isVendor" BOOLEAN NOT NULL DEFAULT false;
