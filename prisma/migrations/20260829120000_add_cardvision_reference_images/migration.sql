-- CreateTable
CREATE TABLE "cardvision_reference_images" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "contentType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cardvision_reference_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cardvision_reference_image_links" (
    "id" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "sourceUrlAtSync" TEXT NOT NULL,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cardvision_reference_image_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cardvision_reference_images_contentHash_idx" ON "cardvision_reference_images"("contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "cardvision_reference_images_sourceUrl_contentHash_key" ON "cardvision_reference_images"("sourceUrl", "contentHash");

-- CreateIndex
CREATE INDEX "cardvision_reference_image_links_gameId_idx" ON "cardvision_reference_image_links"("gameId");

-- CreateIndex
CREATE INDEX "cardvision_reference_image_links_imageId_idx" ON "cardvision_reference_image_links"("imageId");

-- CreateIndex
CREATE UNIQUE INDEX "cardvision_reference_image_links_catalogItemId_size_key" ON "cardvision_reference_image_links"("catalogItemId", "size");

-- AddForeignKey
ALTER TABLE "cardvision_reference_image_links" ADD CONSTRAINT "cardvision_reference_image_links_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "cardvision_reference_images"("id") ON DELETE CASCADE ON UPDATE CASCADE;
