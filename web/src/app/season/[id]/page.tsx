import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasDatabase, prisma } from "@/lib/prisma";

export default async function SeasonPage({
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
            Connect a database to view season details.
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
  const season = await prisma.season.findUnique({
    where: { id },
    include: {
      show: true,
      episodes: { orderBy: { number: "asc" }, include: { videoAsset: true } },
    },
  });

  if (!season) {
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

  const totalRuntimeSec = season.episodes.reduce(
    (total, episode) =>
      total + (episode.runtimeSec ?? episode.videoAsset?.durationSec ?? 0),
    0,
  );
  const releaseYear = season.createdAt.getFullYear();

  return (
    <main className="min-h-screen bg-illuvrse-night px-6 py-16 text-illuvrse-snow">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href={`/show/${season.show.slug}`}
          className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted"
        >
          {season.show.title}
        </Link>
        <h1 className="mt-3 text-3xl font-semibold">
          Season {season.number}
          {season.title ? `: ${season.title}` : ""}
        </h1>
        <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
          <span className="rounded-full border border-illuvrse-stroke bg-illuvrse-panel/70 px-4 py-2">
            {season.show.maturityRating || "NR"}
          </span>
          <span className="rounded-full border border-illuvrse-stroke bg-illuvrse-panel/70 px-4 py-2">
            {releaseYear}
          </span>
          <span className="rounded-full border border-illuvrse-stroke bg-illuvrse-panel/70 px-4 py-2">
            {formatRuntime(totalRuntimeSec)}
          </span>
        </div>
        {season.synopsis && (
          <p className="mt-3 text-sm text-illuvrse-muted">{season.synopsis}</p>
        )}

        <div className="mt-8 space-y-4">
          {season.episodes.length === 0 ? (
            <div className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-5 text-sm text-illuvrse-muted">
              No episodes yet.
            </div>
          ) : (
            season.episodes.map((episode) => (
              <div
                key={episode.id}
                className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-5"
              >
                <div className="flex items-center justify-between">
                  <Link href={`/episode/${episode.id}`} className="text-lg font-semibold">
                    {episode.number}. {episode.title}
                  </Link>
                  {episode.videoAsset?.durationSec && (
                    <span className="text-xs text-illuvrse-muted">
                      {Math.round(episode.videoAsset.durationSec / 60)} min
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-illuvrse-muted">
                  {episode.synopsis || "No synopsis yet."}
                </p>
                <div className="mt-3 flex gap-3">
                  <Link
                    href={`/watch/${episode.id}`}
                    className="text-sm font-semibold text-illuvrse-electric"
                  >
                    Watch
                  </Link>
                </div>
              </div>
            ))
          )}
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
      description: "Connect a database to view season details.",
    };
  }
  const { id } = await params;
  const season = await prisma.season.findUnique({
    where: { id },
    include: { show: true },
  });

  if (!season) {
    return {
      title: "Season not found | ILLUVRSE",
      description: "This season is not available.",
    };
  }

  const title = `Season ${season.number} | ${season.show.title} | ILLUVRSE`;
  const description = season.synopsis || season.show.synopsis || "Season details.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: season.show.posterUrl ? [{ url: season.show.posterUrl }] : [],
    },
  };
}
