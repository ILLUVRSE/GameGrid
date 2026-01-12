import { prisma } from "@/lib/prisma";

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
        <div className="mt-8 rounded-3xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-8">
          <p className="text-sm text-illuvrse-muted">
            Video playback placeholder. Attach a VideoAsset to enable playback.
          </p>
          {episode.videoAsset && (
            <div className="mt-4 text-xs text-illuvrse-muted">
              Source: {episode.videoAsset.hlsManifestUrl || episode.videoAsset.sourceUrl}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
