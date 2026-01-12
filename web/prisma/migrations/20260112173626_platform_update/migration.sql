/*
  Warnings:

  - You are about to drop the column `duration` on the `VideoAsset` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `VideoAsset` table. All the data in the column will be lost.
  - You are about to drop the `Channel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChannelItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EpisodeEmbedding` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShowEmbedding` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'EDITOR';

-- DropForeignKey
ALTER TABLE "ChannelItem" DROP CONSTRAINT "ChannelItem_channelId_fkey";

-- DropForeignKey
ALTER TABLE "ChannelItem" DROP CONSTRAINT "ChannelItem_episodeId_fkey";

-- DropForeignKey
ALTER TABLE "EpisodeEmbedding" DROP CONSTRAINT "EpisodeEmbedding_episodeId_fkey";

-- DropForeignKey
ALTER TABLE "ShowEmbedding" DROP CONSTRAINT "ShowEmbedding_showId_fkey";

-- AlterTable
ALTER TABLE "Episode" ADD COLUMN     "embeddingVector" vector,
ADD COLUMN     "runtimeSec" INTEGER;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "kidsMode" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Show" ADD COLUMN     "embeddingVector" vector,
ADD COLUMN     "heroImageUrl" TEXT,
ADD COLUMN     "posterUrl" TEXT;

-- AlterTable
ALTER TABLE "VideoAsset" DROP COLUMN "duration",
DROP COLUMN "url",
ADD COLUMN     "durationSec" INTEGER,
ADD COLUMN     "hlsManifestUrl" TEXT,
ADD COLUMN     "sourceUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "subtitlesUrl" TEXT;

-- AlterTable
ALTER TABLE "WatchProgress" ADD COLUMN     "profileId" TEXT;

-- DropTable
DROP TABLE "Channel";

-- DropTable
DROP TABLE "ChannelItem";

-- DropTable
DROP TABLE "EpisodeEmbedding";

-- DropTable
DROP TABLE "ShowEmbedding";

-- CreateTable
CREATE TABLE "Station" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rulesJson" JSONB,
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StationQueueItem" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StationQueueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsageLog" (
    "id" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "tokens" INTEGER,
    "costEstimate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscodeJob" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "outputPath" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranscodeJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Station_slug_key" ON "Station"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "StationQueueItem_stationId_position_key" ON "StationQueueItem"("stationId", "position");

-- AddForeignKey
ALTER TABLE "StationQueueItem" ADD CONSTRAINT "StationQueueItem_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationQueueItem" ADD CONSTRAINT "StationQueueItem_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
