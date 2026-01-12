-- Enable pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Extend Show with AI metadata
ALTER TABLE "Show"
  ADD COLUMN IF NOT EXISTS "logline" TEXT,
  ADD COLUMN IF NOT EXISTS "seoDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "maturityRating" TEXT,
  ADD COLUMN IF NOT EXISTS "contentWarnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "kidsSafe" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "kidsSafeReason" TEXT,
  ADD COLUMN IF NOT EXISTS "aiMetadataUpdatedAt" TIMESTAMP(3);

-- Extend Episode with AI metadata
ALTER TABLE "Episode"
  ADD COLUMN IF NOT EXISTS "logline" TEXT,
  ADD COLUMN IF NOT EXISTS "seoDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "maturityRating" TEXT,
  ADD COLUMN IF NOT EXISTS "contentWarnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "kidsSafe" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "kidsSafeReason" TEXT,
  ADD COLUMN IF NOT EXISTS "aiMetadataUpdatedAt" TIMESTAMP(3);

-- Embeddings tables (pgvector)
CREATE TABLE IF NOT EXISTS "ShowEmbedding" (
  "id" TEXT NOT NULL,
  "showId" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "embedding" vector(1536) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShowEmbedding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ShowEmbedding_showId_key" ON "ShowEmbedding"("showId");

ALTER TABLE "ShowEmbedding"
  ADD CONSTRAINT "ShowEmbedding_showId_fkey"
  FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "EpisodeEmbedding" (
  "id" TEXT NOT NULL,
  "episodeId" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "embedding" vector(1536) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EpisodeEmbedding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EpisodeEmbedding_episodeId_key" ON "EpisodeEmbedding"("episodeId");

ALTER TABLE "EpisodeEmbedding"
  ADD CONSTRAINT "EpisodeEmbedding_episodeId_fkey"
  FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Radio channels
CREATE TABLE IF NOT EXISTS "Channel" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "theme" TEXT,
  "isAiGenerated" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Channel_slug_key" ON "Channel"("slug");

CREATE TABLE IF NOT EXISTS "ChannelItem" (
  "id" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "episodeId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChannelItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChannelItem_channelId_position_key" ON "ChannelItem"("channelId", "position");

ALTER TABLE "ChannelItem"
  ADD CONSTRAINT "ChannelItem_channelId_fkey"
  FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChannelItem"
  ADD CONSTRAINT "ChannelItem_episodeId_fkey"
  FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Vector indexes for similarity search
CREATE INDEX IF NOT EXISTS "ShowEmbedding_embedding_idx" ON "ShowEmbedding" USING ivfflat ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "EpisodeEmbedding_embedding_idx" ON "EpisodeEmbedding" USING ivfflat ("embedding" vector_cosine_ops);
