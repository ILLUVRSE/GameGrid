import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [featured, latestShows, latestEpisodes] = await Promise.all([
    prisma.show.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.show.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.episode.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { season: { include: { show: true } } },
    }),
  ]);

  return NextResponse.json({
    featured,
    rails: [
      {
        id: "latest-shows",
        title: "Latest shows",
        items: latestShows.map((show) => ({
          type: "show",
          id: show.id,
          title: show.title,
          synopsis: show.synopsis,
          slug: show.slug,
        })),
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
    ],
  });
}
