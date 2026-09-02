-- Binder Planner was per-browser only (localStorage, "cardstory:binder:v1")
-- until now — this gives it real tables so a binder started on one device
-- still shows up on another. See src/lib/binder/manage.ts.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "activeBinderId" TEXT,
ADD COLUMN     "showNumberTags" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showNotOwnedTags" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "binders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "layoutId" TEXT NOT NULL DEFAULT '9',
    "coverColor" TEXT NOT NULL DEFAULT 'black',
    "pageBackground" TEXT NOT NULL DEFAULT 'match-cover',
    "status" TEXT NOT NULL DEFAULT 'wip',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "binders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "binder_pages" (
    "id" TEXT NOT NULL,
    "binderId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "pockets" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "binder_pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "binders_userId_idx" ON "binders"("userId");

-- CreateIndex
CREATE INDEX "binder_pages_binderId_sortOrder_idx" ON "binder_pages"("binderId", "sortOrder");

-- AddForeignKey
ALTER TABLE "binders" ADD CONSTRAINT "binders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "binder_pages" ADD CONSTRAINT "binder_pages_binderId_fkey" FOREIGN KEY ("binderId") REFERENCES "binders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
