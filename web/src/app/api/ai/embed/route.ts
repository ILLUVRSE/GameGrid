import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth/session";
import { Role } from "@prisma/client";
import { upsertEpisodeEmbedding, upsertShowEmbedding } from "@/lib/ai/embeddings";
import { logAiUsage } from "@/lib/ai/cost";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";


type EmbedRequest = {
  type?: "show" | "episode" | "all";
  limit?: number;
  force?: boolean;
};


function isAdmin(req: NextRequest) {
  const session = getSessionFromRequest(req);
  return session?.role === Role.ADMIN || session?.role === Role.EDITOR;
}

function formatShowEmbeddingInput(show: {
  title: string;
  synopsis: string | null;
  logline: string | null;
  genres: string[];
  tags: string[];
}) {
  return [
    `Title: ${show.title}`,
    show.logline ? `Logline: ${show.logline}` : null,
    show.synopsis ? `Synopsis: ${show.synopsis}` : null,
    show.genres.length ? `Genres: ${show.genres.join(", ")}` : null,
    show.tags.length ? `Tags: ${show.tags.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatEpisodeEmbeddingInput(episode: {
  title: string;
  synopsis: string | null;
  logline: string | null;
  tags: string[];
  showTitle: string;
  seasonNumber: number;
}) {
  return [
    `Show: ${episode.showTitle}`,
    `Season: ${episode.seasonNumber}`,
    `Episode: ${episode.title}`,
    episode.logline ? `Logline: ${episode.logline}` : null,
    episode.synopsis ? `Synopsis: ${episode.synopsis}` : null,
    episode.tags.length ? `Tags: ${episode.tags.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: EmbedRequest;
  try {
    body = (await req.json()) as EmbedRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const type = body.type ?? "all";
  const limit = Math.min(Math.max(Number(body.limit || 20), 1), 100);
  const results: { shows: number; episodes: number } = { shows: 0, episodes: 0 };

  if (type === "show" || type === "all") {
    const shows = await prisma.show.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    for (const show of shows) {
      const embeddingInput = formatShowEmbeddingInput(show);
      const embeddingResult = await upsertShowEmbedding(show.id, embeddingInput);
      await logAiUsage({
        route: "/api/ai/embed",
        model: embeddingResult.model,
        usage: embeddingResult.usage,
      });
      results.shows += 1;
    }
  }

  if (type === "episode" || type === "all") {
    const episodes = await prisma.episode.findMany({
      include: { season: { include: { show: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    for (const episode of episodes) {
      const embeddingInput = formatEpisodeEmbeddingInput({
        title: episode.title,
        synopsis: episode.synopsis,
        logline: episode.logline,
        tags: episode.tags,
        showTitle: episode.season.show.title,
        seasonNumber: episode.season.number,
      });
      const embeddingResult = await upsertEpisodeEmbedding(episode.id, embeddingInput);
      await logAiUsage({
        route: "/api/ai/embed",
        model: embeddingResult.model,
        usage: embeddingResult.usage,
      });
      results.episodes += 1;
    }
  }

  return NextResponse.json({ status: "ok", embedded: results });
}
