import Link from "next/link";
import { hasDatabase, prisma } from "@/lib/prisma";
import VideoPlayer from "@/components/VideoPlayer";
import type { Metadata } from "next";

const formatRuntime = (seconds?: number | null) => {
  if (!seconds || Number.isNaN(seconds)) return "TBD";
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h ${remaining}m`;
};

const formatBytes = (bytes?: number | null) => {
  if (!bytes || Number.isNaN(bytes)) return "TBD";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

export default async function WatchPage({
  params,
}: {
  params: Promise<{ episodeId: string }>;
}) {
  const { episodeId } = await params;
  if (!hasDatabase) {
    return (
      <main className="min-h-screen bg-illuvrse-night px-6 py-20 text-illuvrse-snow">
        <div className="mx-auto w-full max-w-3xl text-center">
          <h1 className="text-3xl font-semibold">Database not configured</h1>
          <p className="mt-3 text-sm text-illuvrse-muted">
            Connect a database to enable playback.
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
    where: { id: episodeId },
    include: {
      videoAsset: true,
      season: {
        include: {
          show: true,
          episodes: { orderBy: { number: "asc" } },
        },
      },
    },
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

  const runtimeSec = episode.runtimeSec ?? episode.videoAsset?.durationSec ?? null;
  const showYear = episode.season.show.createdAt.getFullYear();
  const episodeTags =
    episode.tags.length > 0 ? episode.tags : episode.season.show.tags ?? [];
  const contentWarnings =
    episode.contentWarnings.length > 0
      ? episode.contentWarnings
      : episode.season.show.contentWarnings ?? [];
  const seasonEpisodes = episode.season.episodes ?? [];
  const currentIndex = seasonEpisodes.findIndex(
    (seasonEpisode) => seasonEpisode.id === episode.id,
  );
  const nextEpisodes =
    currentIndex >= 0 ? seasonEpisodes.slice(currentIndex + 1, currentIndex + 4) : [];
  const queueEpisodes =
    currentIndex >= 0
      ? seasonEpisodes.slice(Math.max(0, currentIndex - 2), currentIndex + 3)
      : seasonEpisodes.slice(0, 5);
  const hasAdaptiveStream = Boolean(episode.videoAsset?.hlsManifestUrl);
  const streamLabel = hasAdaptiveStream ? "Adaptive HLS" : "Direct MP4";

  return (
    <main className="min-h-screen bg-illuvrse-night px-6 pb-20 pt-12 text-illuvrse-snow">
      <div className="mx-auto w-full max-w-6xl space-y-10">
        <section className="relative overflow-hidden rounded-3xl border border-illuvrse-stroke bg-gradient-to-br from-[#10192b] via-[#182338] to-[#0e1525] p-8 md:p-10">
          <div className="absolute -right-16 top-10 h-44 w-44 rounded-full bg-illuvrse-electric/20 blur-3xl" />
          <div className="absolute bottom-6 left-10 h-36 w-36 rounded-full bg-illuvrse-ember/20 blur-3xl" />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-illuvrse-muted">
                {episode.season.show.title} · Season {episode.season.number}
              </p>
              <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
                {episode.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-illuvrse-muted md:text-base">
                {episode.synopsis || "No synopsis yet."}
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                <span className="rounded-full border border-illuvrse-stroke bg-illuvrse-panel/70 px-4 py-2">
                  Episode {episode.number}
                </span>
                <span className="rounded-full border border-illuvrse-stroke bg-illuvrse-panel/70 px-4 py-2">
                  {episode.maturityRating || episode.season.show.maturityRating || "NR"}
                </span>
                <span className="rounded-full border border-illuvrse-stroke bg-illuvrse-panel/70 px-4 py-2">
                  {formatRuntime(runtimeSec)}
                </span>
                <span className="rounded-full border border-illuvrse-stroke bg-illuvrse-panel/70 px-4 py-2">
                  {showYear}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/show/${episode.season.show.slug}`}
                className="rounded-full border border-illuvrse-stroke px-6 py-3 text-sm font-semibold text-illuvrse-snow transition hover:border-illuvrse-electric hover:text-illuvrse-electric"
              >
                Back to show
              </Link>
              <Link
                href="/home"
                className="rounded-full bg-illuvrse-glow px-6 py-3 text-sm font-semibold text-illuvrse-night transition hover:bg-illuvrse-ember"
              >
                Browse home
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <VideoPlayer
              episodeId={episode.id}
              hlsUrl={episode.videoAsset?.hlsManifestUrl}
              sourceUrl={episode.videoAsset?.sourceUrl}
              posterUrl={episode.season.show.posterUrl}
            />
            <div className="rounded-3xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                Episode details
              </p>
              <p className="mt-3 text-sm text-illuvrse-muted">
                {episode.logline || episode.season.show.logline || "No logline yet."}
              </p>
              {episodeTags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  {episodeTags.slice(0, 8).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-illuvrse-stroke px-3 py-1 text-illuvrse-snow"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                Streaming specs
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between text-illuvrse-muted">
                  <dt>Stream</dt>
                  <dd className="text-illuvrse-snow">{streamLabel}</dd>
                </div>
                <div className="flex items-center justify-between text-illuvrse-muted">
                  <dt>Runtime</dt>
                  <dd className="text-illuvrse-snow">{formatRuntime(runtimeSec)}</dd>
                </div>
                <div className="flex items-center justify-between text-illuvrse-muted">
                  <dt>Format</dt>
                  <dd className="text-illuvrse-snow">
                    {episode.videoAsset?.format || "TBD"}
                  </dd>
                </div>
                <div className="flex items-center justify-between text-illuvrse-muted">
                  <dt>Asset size</dt>
                  <dd className="text-illuvrse-snow">
                    {formatBytes(episode.videoAsset?.size)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-3xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                Content cues
              </p>
              <div className="mt-4 space-y-3 text-sm text-illuvrse-muted">
                {contentWarnings.length > 0 ? (
                  <ul className="space-y-2 text-illuvrse-snow">
                    {contentWarnings.slice(0, 4).map((warning) => (
                      <li key={warning} className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-illuvrse-ember" />
                        {warning}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No warnings listed.</p>
                )}
                <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                  Kids safe: {episode.kidsSafe ? "Yes" : "No"}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-illuvrse-stroke bg-gradient-to-br from-[#111a2a] to-[#1a2740] p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                Season queue
              </p>
              {queueEpisodes.length > 0 ? (
                <ul className="mt-4 space-y-3 text-sm">
                  {queueEpisodes.map((seasonEpisode) => {
                    const isCurrent = seasonEpisode.id === episode.id;
                    return (
                      <li
                        key={seasonEpisode.id}
                        className={`flex items-center justify-between rounded-2xl border px-3 py-2 ${
                          isCurrent
                            ? "border-illuvrse-electric bg-illuvrse-night/70 text-illuvrse-electric"
                            : "border-illuvrse-stroke bg-illuvrse-panel/60 text-illuvrse-snow"
                        }`}
                      >
                        <span>
                          {seasonEpisode.number}. {seasonEpisode.title}
                        </span>
                        {!isCurrent && (
                          <Link
                            href={`/watch/${seasonEpisode.id}`}
                            className="text-xs font-semibold text-illuvrse-glow"
                          >
                            Play
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-illuvrse-muted">No queue yet.</p>
              )}
            </div>

            {nextEpisodes.length > 0 && (
              <div className="rounded-3xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                  Next up
                </p>
                <div className="mt-4 space-y-3 text-sm">
                  {nextEpisodes.map((nextEpisode) => (
                    <Link
                      key={nextEpisode.id}
                      href={`/watch/${nextEpisode.id}`}
                      className="flex items-center justify-between rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/60 px-3 py-2 text-illuvrse-snow transition hover:border-illuvrse-electric hover:text-illuvrse-electric"
                    >
                      <span>
                        Ep {nextEpisode.number}: {nextEpisode.title}
                      </span>
                      <span className="text-xs text-illuvrse-muted">Continue</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ episodeId: string }>;
}): Promise<Metadata> {
  if (!hasDatabase) {
    return {
      title: "ILLUVRSE",
      description: "Connect a database to enable playback.",
    };
  }
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
