import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";


export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  const [featured, latestShows, latestEpisodes, continueWatching, showsWithStats] =
    await Promise.all([
    prisma.show.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.show.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.episode.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { season: { include: { show: true } } },
    }),
    session
      ? prisma.watchProgress.findMany({
          where: { userId: session.userId },
          orderBy: { updatedAt: "desc" },
          take: 8,
          include: {
            episode: {
              include: {
                season: { include: { show: true } },
                videoAsset: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    prisma.show.findMany({
      include: { seasons: { include: { episodes: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const rails = [];

  if (continueWatching.length > 0) {
    rails.push({
      id: "continue-watching",
      title: "Continue watching",
      items: continueWatching.map((progress) => ({
        type: "episode",
        id: progress.episode.id,
        title: progress.episode.title,
        synopsis: progress.episode.synopsis,
        seasonNumber: progress.episode.season.number,
        showTitle: progress.episode.season.show.title,
        showSlug: progress.episode.season.show.slug,
        progressSec: progress.position,
        durationSec:
          progress.episode.runtimeSec ?? progress.episode.videoAsset?.durationSec ?? null,
      })),
    });
  }

  const showItems = <
    T extends {
      id: string;
      title: string;
      synopsis: string | null;
      slug: string;
      posterUrl: string | null;
    },
  >(
    shows: T[],
  ) =>
    shows.map((show) => ({
      type: "show",
      id: show.id,
      title: show.title,
      synopsis: show.synopsis,
      slug: show.slug,
      posterUrl: show.posterUrl,
    }));

  const trendingShows = [...showsWithStats]
    .map((show) => {
      const episodes = show.seasons.flatMap((season) => season.episodes);
      const lastEpisodeAt = episodes.reduce<Date | null>((latest, episode) => {
        if (!latest) return episode.createdAt;
        return episode.createdAt > latest ? episode.createdAt : latest;
      }, null);
      return {
        show,
        episodeCount: episodes.length,
        lastEpisodeAt: lastEpisodeAt?.getTime() ?? 0,
      };
    })
    .sort((a, b) =>
      b.episodeCount === a.episodeCount
        ? b.lastEpisodeAt - a.lastEpisodeAt
        : b.episodeCount - a.episodeCount,
    )
    .slice(0, 6)
    .map((entry) => entry.show);

  const forYouShows = [...showsWithStats].reverse().slice(0, 6);
  const newShows = showsWithStats.slice(0, 6);

  if (trendingShows.length > 0) {
    rails.push({
      id: "trending",
      title: "Trending now",
      items: showItems(trendingShows),
    });
  }

  if (newShows.length > 0) {
    rails.push({
      id: "new-this-week",
      title: "New drops",
      items: showItems(newShows),
    });
  }

  if (forYouShows.length > 0) {
    rails.push({
      id: "for-you",
      title: "For you",
      items: showItems(forYouShows),
    });
  }

  rails.push(
    {
      id: "latest-shows",
      title: "Latest shows",
      items: showItems(latestShows),
    },
    {
      id: "latest-episodes",
      title: "New episodes",
      items: latestEpisodes.map((episode) => ({
        type: "episode",
        id: episode.id,
        title: episode.title,
        synopsis: episode.synopsis,
        seasonNumber: episode.season.number,
        showTitle: episode.season.show.title,
        showSlug: episode.season.show.slug,
      })),
    },
  );

  return NextResponse.json({
    featured,
    rails,
  });
}
