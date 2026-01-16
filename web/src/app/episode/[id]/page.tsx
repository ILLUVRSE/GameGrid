import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasDatabase, prisma } from "@/lib/prisma";
import WatchlistButton from "@/components/WatchlistButton";

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!hasDatabase) {
    return (
      <main className="min-h-screen bg-illuvrse-night px-6 py-20 text-illuvrse-snow">
        <div className="mx-auto w-full max-w-3xl text-center">
          <h1 className="text-3xl font-semibold">Database not configured</h1>
          <p className="mt-3 text-sm text-illuvrse-muted">
            Connect a database to view episode details.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-full border border-illuvrse-stroke px-6 py-3 text-sm font-semibold text-illuvrse-snow"
          >
            Back to ILLUVRSE
          </Link>
        </div>
      </main>
    );
  }
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

  const formatRuntime = (seconds: number | null) => {
    if (!seconds || Number.isNaN(seconds)) return "TBD";
    const minutes = Math.max(1, Math.round(seconds / 60));
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return `${hours}h ${remaining}m`;
  };

  const runtimeSec = episode.runtimeSec ?? episode.videoAsset?.durationSec ?? null;
  const releaseYear = episode.createdAt.getFullYear();
  const runtimeLabel = formatRuntime(runtimeSec);
  const tags = episode.tags.filter((tag) => tag.trim().length > 0);
  const warnings = episode.contentWarnings.filter((warning) => warning.trim().length > 0);

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
        <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
          <span className="rounded-full border border-illuvrse-stroke bg-illuvrse-panel/70 px-4 py-2">
            {episode.maturityRating || episode.season.show.maturityRating || "NR"}
          </span>
          <span className="rounded-full border border-illuvrse-stroke bg-illuvrse-panel/70 px-4 py-2">
            {releaseYear}
          </span>
          <span className="rounded-full border border-illuvrse-stroke bg-illuvrse-panel/70 px-4 py-2">
            {formatRuntime(runtimeSec)}
          </span>
        </div>
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
          <WatchlistButton episodeId={episode.id} />
        </div>
        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
              Runtime
            </p>
            <p className="mt-2 text-lg font-semibold">{runtimeLabel}</p>
            <p className="mt-2 text-sm text-illuvrse-muted">
              Rating: {episode.maturityRating || episode.season.show.maturityRating || "NR"}
            </p>
          </div>
          <div className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
              Production notes
            </p>
            <p className="mt-2 text-sm text-illuvrse-muted">
              {episode.logline ||
                episode.seoDescription ||
                "Production details coming soon."}
            </p>
          </div>
          <div className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Cast</p>
            <p className="mt-2 text-sm text-illuvrse-muted">
              {tags.length > 0 ? tags.join(" · ") : "Cast details pending."}
            </p>
          </div>
          <div className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
              Content warnings
            </p>
            <p className="mt-2 text-sm text-illuvrse-muted">
              {warnings.length > 0 ? warnings.join(" · ") : "No warnings listed."}
            </p>
          </div>
        </section>
        <div className="mt-8 rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-5 text-sm text-illuvrse-muted">
          {episode.videoAsset?.hlsManifestUrl
            ? `HLS manifest ready at ${episode.videoAsset.hlsManifestUrl}`
            : "No transcoded asset yet. Use the admin panel to transcode."}
        </div>
      </div>
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  if (!hasDatabase) {
    return {
      title: "ILLUVRSE",
      description: "Connect a database to view episode details.",
    };
  }
  const { id } = await params;
  const episode = await prisma.episode.findUnique({
    where: { id },
    include: { season: { include: { show: true } } },
  });

  if (!episode) {
    return {
      title: "Episode not found | ILLUVRSE",
      description: "This episode is not available.",
    };
  }

  const title = `${episode.title} | ${episode.season.show.title} | ILLUVRSE`;
  const description =
    episode.seoDescription ||
    episode.synopsis ||
    episode.season.show.synopsis ||
    "Episode details.";

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
