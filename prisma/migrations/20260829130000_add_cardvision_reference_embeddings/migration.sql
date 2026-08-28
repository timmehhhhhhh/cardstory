-- CreateTable
CREATE TABLE "cardvision_reference_embeddings" (
    "id" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "dims" INTEGER NOT NULL,
    "vector" BYTEA NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cardvision_reference_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cardvision_reference_embeddings_provider_idx" ON "cardvision_reference_embeddings"("provider");

-- CreateIndex
CREATE INDEX "cardvision_reference_embeddings_gameId_idx" ON "cardvision_reference_embeddings"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "cardvision_reference_embeddings_catalogItemId_variantKey_pr_key" ON "cardvision_reference_embeddings"("catalogItemId", "variantKey", "provider");
