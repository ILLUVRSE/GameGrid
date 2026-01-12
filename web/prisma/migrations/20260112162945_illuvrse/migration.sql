-- DropForeignKey
ALTER TABLE "ChannelItem" DROP CONSTRAINT "ChannelItem_channelId_fkey";

-- DropForeignKey
ALTER TABLE "ChannelItem" DROP CONSTRAINT "ChannelItem_episodeId_fkey";

-- DropForeignKey
ALTER TABLE "EpisodeEmbedding" DROP CONSTRAINT "EpisodeEmbedding_episodeId_fkey";

-- DropForeignKey
ALTER TABLE "ShowEmbedding" DROP CONSTRAINT "ShowEmbedding_showId_fkey";

-- DropIndex
DROP INDEX "EpisodeEmbedding_embedding_idx";

-- DropIndex
DROP INDEX "ShowEmbedding_embedding_idx";

-- AddForeignKey
ALTER TABLE "ShowEmbedding" ADD CONSTRAINT "ShowEmbedding_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodeEmbedding" ADD CONSTRAINT "EpisodeEmbedding_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelItem" ADD CONSTRAINT "ChannelItem_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelItem" ADD CONSTRAINT "ChannelItem_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
