import { prisma } from "@/lib/prisma";
import VideoPlayer from "@/components/VideoPlayer";
import type { Metadata } from "next";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ episodeId: string }>;
}) {
  const { episodeId } = await params;
  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    include: { videoAsset: true, season: { include: { show: true } } },
  });

  if (!episode) {
    return (
      <main className="min-h-screen bg-illuvrse-night px-6 py-20 text-illuvrse-snow">
        <div className="mx-auto w-full max-w-4xl">
          <h1 className="text-2xl font-semibold">Episode not found</h1>
          <p className="mt-3 text-sm text-illuvrse-muted">
            This episode does not exist yet. Try another episode.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-illuvrse-night px-6 py-16 text-illuvrse-snow">
      <div className="mx-auto w-full max-w-5xl">
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
          {episode.season.show.title} · Season {episode.season.number}
        </p>
        <h1 className="mt-3 text-3xl font-semibold">{episode.title}</h1>
        <p className="mt-3 text-sm text-illuvrse-muted">
          {episode.synopsis || "No synopsis yet."}
        </p>
        <div className="mt-8">
          <VideoPlayer
            episodeId={episode.id}
            hlsUrl={episode.videoAsset?.hlsManifestUrl}
            sourceUrl={episode.videoAsset?.sourceUrl}
            posterUrl={episode.season.show.posterUrl}
          />
        </div>
      </div>
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ episodeId: string }>;
}): Promise<Metadata> {
  const { episodeId } = await params;
  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    include: { season: { include: { show: true } } },
  });

  if (!episode) {
    return {
      title: "Watch | ILLUVRSE",
      description: "Playback is unavailable for this episode.",
    };
  }

  const title = `Watch ${episode.title} | ${episode.season.show.title}`;
  const description =
    episode.seoDescription ||
    episode.synopsis ||
    episode.season.show.synopsis ||
    "Streaming on ILLUVRSE.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: episode.season.show.posterUrl ? [{ url: episode.season.show.posterUrl }] : [],
    },
  };
}
