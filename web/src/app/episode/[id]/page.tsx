import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const episode = await prisma.episode.findUnique({
    where: { id },
    include: {
      season: { include: { show: true } },
      videoAsset: true,
    },
  });

  if (!episode) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-illuvrse-night px-6 py-16 text-illuvrse-snow">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          href={`/show/${episode.season.show.slug}`}
          className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted"
        >
          {episode.season.show.title} · Season {episode.season.number}
        </Link>
        <h1 className="mt-3 text-3xl font-semibold">{episode.title}</h1>
        <p className="mt-3 text-sm text-illuvrse-muted">
          {episode.synopsis || "No synopsis yet."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/watch/${episode.id}`}
            className="rounded-full bg-illuvrse-glow px-6 py-3 text-sm font-semibold text-illuvrse-night"
          >
            Watch now
          </Link>
          <Link
            href={`/season/${episode.season.id}`}
            className="rounded-full border border-illuvrse-stroke px-6 py-3 text-sm font-semibold text-illuvrse-snow"
          >
            Back to season
          </Link>
        </div>
        <div className="mt-8 rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-5 text-sm text-illuvrse-muted">
          {episode.videoAsset?.hlsManifestUrl
            ? `HLS manifest ready at ${episode.videoAsset.hlsManifestUrl}`
            : "No transcoded asset yet. Use the admin panel to transcode."}
        </div>
      </div>
    </main>
  );
}
