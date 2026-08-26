-- CreateTable
CREATE TABLE "curated_sets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "targetQuantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curated_sets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "curated_sets_userId_idx" ON "curated_sets"("userId");

-- AddForeignKey
ALTER TABLE "curated_sets" ADD CONSTRAINT "curated_sets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
