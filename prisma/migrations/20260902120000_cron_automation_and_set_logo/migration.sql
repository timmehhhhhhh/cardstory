-- Adds the automation infrastructure for scheduled Pokémon catalog/image/
-- set-logo/nameEn sync jobs and the (off-by-default) sports-image backfill —
-- see /Users/timlim/.claude/plans/please-action-the-previous-lovely-key.md.
-- Purely additive: two new tables, one new nullable column. Zero risk to
-- existing data.

-- CreateTable
CREATE TABLE "cron_job_states" (
    "name" TEXT NOT NULL,
    "cursor" JSONB,
    "lastRunAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "lastError" TEXT,
    "lastSummary" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cron_job_states_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "crawled_image_candidates" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "catalogItemGameId" TEXT,
    "catalogItemExternalId" TEXT,
    "setId" TEXT,
    "sportsCardItemId" TEXT,
    "imageUrl" TEXT,
    "imageBackUrl" TEXT,
    "logoUrl" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,

    CONSTRAINT "crawled_image_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crawled_image_candidates_source_status_idx" ON "crawled_image_candidates"("source", "status");

-- CreateIndex
CREATE INDEX "crawled_image_candidates_targetType_status_idx" ON "crawled_image_candidates"("targetType", "status");

-- AlterTable
ALTER TABLE "sports_card_items" ADD COLUMN     "setLogoUrl" TEXT;
