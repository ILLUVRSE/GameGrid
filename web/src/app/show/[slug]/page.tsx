import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getShowBySlug } from "@/lib/db/show";
import { prisma } from "@/lib/prisma";
import WatchlistButton from "@/components/WatchlistButton";

export default async function ShowPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const show = await getShowBySlug(slug);

  if (!show) {
    notFound();
  }

  const relatedFilters = [];
  if (show.tags.length > 0) {
    relatedFilters.push({ tags: { hasSome: show.tags } });
  }
  if (show.genres.length > 0) {
    relatedFilters.push({ genres: { hasSome: show.genres } });
  }

  const relatedShows =
    relatedFilters.length > 0
      ? await prisma.show.findMany({
          where: {
            id: { not: show.id },
            OR: relatedFilters,
          },
          take: 4,
        })
      : [];

  const formatRuntime = (seconds: number | null) => {
    if (!seconds || Number.isNaN(seconds)) return "TBD";
    const minutes = Math.max(1, Math.round(seconds / 60));
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return `${hours}h ${remaining}m`;
  };

  const totalEpisodes = show.seasons.reduce(
    (count, season) => count + season.episodes.length,
    0,
  );
  const totalRuntimeSec = show.seasons.reduce(
    (total, season) =>
      total +
      season.episodes.reduce(
        (seasonTotal, episode) =>
          seasonTotal +
          (episode.runtimeSec ?? episode.videoAsset?.durationSec ?? 0),
        0,
      ),
    0,
  );
  const releaseYear = show.createdAt.getFullYear();
  const latestEpisode = show.seasons
    .flatMap((season) =>
      season.episodes.map((episode) => ({ episode, seasonNumber: season.number })),
    )
    .sort(
      (a, b) =>
        b.seasonNumber - a.seasonNumber || b.episode.number - a.episode.number,
    )[0]?.episode;
  const nextEpisode = latestEpisode;

  return (
    <main className="min-h-screen bg-illuvrse-night px-6 pb-20 pt-12 text-illuvrse-snow">
      <section className="mx-auto w-full max-w-6xl">
        <div className="relative overflow-hidden rounded-3xl border border-illuvrse-stroke bg-gradient-to-br from-illuvrse-dusk via-[#1b2439] to-[#0f1627] p-10 md:p-14">
          {show.heroImageUrl && (
            <img
              src={show.heroImageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-20"
            />
          )}
          <div className="absolute -right-20 top-10 h-48 w-48 rounded-full bg-illuvrse-ember/20 blur-3xl" />
          <div className="absolute bottom-6 left-10 h-40 w-40 rounded-full bg-illuvrse-electric/25 blur-3xl" />
          <div className="relative z-10 max-w-3xl">
            <p className="text-xs uppercase tracking-[0.45em] text-illuvrse-muted">
              ILLUVRSE ORIGINAL
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight md:text-5xl">
              {show.title}
            </h1>
            <p className="mt-4 text-base text-illuvrse-muted md:text-lg">
              {show.synopsis || "A new world awaits in this original series."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
              <span className="rounded-full border border-illuvrse-stroke bg-illuvrse-panel/70 px-4 py-2">
                {show.maturityRating || "NR"}
              </span>
              <span className="rounded-full border border-illuvrse-stroke bg-illuvrse-panel/70 px-4 py-2">
                {releaseYear}
              </span>
              <span className="rounded-full border border-illuvrse-stroke bg-illuvrse-panel/70 px-4 py-2">
                {formatRuntime(totalRuntimeSec)}
              </span>
            </div>
            <div className="mt-6 grid gap-4 text-xs uppercase tracking-[0.3em] text-illuvrse-muted md:grid-cols-3">
              <div className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-4">
                Seasons <span className="mt-2 block text-lg font-semibold text-illuvrse-snow">
                  {show.seasons.length}
                </span>
              </div>
              <div className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-4">
                Episodes <span className="mt-2 block text-lg font-semibold text-illuvrse-snow">
                  {totalEpisodes}
                </span>
              </div>
              <div className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-4">
                Status <span className="mt-2 block text-lg font-semibold text-illuvrse-snow">
                  Live
                </span>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/home"
                className="rounded-full bg-illuvrse-glow px-6 py-3 text-sm font-semibold text-illuvrse-night transition hover:bg-illuvrse-ember"
              >
                Back to Home
              </Link>
              {latestEpisode && (
                <Link
                  href={`/watch/${latestEpisode.id}`}
                  className="rounded-full bg-illuvrse-electric px-6 py-3 text-sm font-semibold text-illuvrse-night transition hover:bg-illuvrse-glow"
                >
                  Play latest episode
                </Link>
              )}
              <Link
                href="/search"
                className="rounded-full border border-illuvrse-stroke px-6 py-3 text-sm font-semibold text-illuvrse-snow transition hover:border-illuvrse-electric hover:text-illuvrse-electric"
              >
                Explore catalog
              </Link>
              <WatchlistButton showId={show.id} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl space-y-6">
        {show.seasons.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
              Seasons
            </span>
            {show.seasons.map((season) => (
              <Link
                key={season.id}
                href={`#season-${season.id}`}
                className="rounded-full border border-illuvrse-stroke px-4 py-2 text-xs font-semibold text-illuvrse-snow transition hover:border-illuvrse-electric hover:text-illuvrse-electric"
              >
                S{season.number}
              </Link>
            ))}
          </div>
        )}

        {nextEpisode && (
          <div className="rounded-3xl border border-illuvrse-stroke bg-gradient-to-br from-[#10192b] to-[#18263d] p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
              Next up
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-lg font-semibold">{nextEpisode.title}</p>
                <p className="mt-1 text-sm text-illuvrse-muted">
                  Episode {nextEpisode.number}
                </p>
              </div>
              <Link
                href={`/watch/${nextEpisode.id}`}
                className="rounded-full bg-illuvrse-glow px-5 py-2 text-sm font-semibold text-illuvrse-night"
              >
                Continue
              </Link>
            </div>
          </div>
        )}

        {show.seasons.length === 0 ? (
          <div className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-6 text-illuvrse-muted">
            No seasons available yet.
          </div>
        ) : (
          <div className="space-y-8">
            {show.seasons.map((season) => (
              <section
                key={season.id}
                id={`season-${season.id}`}
                className="rounded-3xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-7"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                      Season {season.number}
                    </p>
                    <h2 className="mt-2 font-display text-2xl font-semibold">
                      {season.title ? season.title : `Season ${season.number}`}
                    </h2>
                  </div>
                  <Link
                    href={`/season/${season.id}`}
                    className="text-sm font-semibold text-illuvrse-electric"
                  >
                    Open season
                  </Link>
                </div>
                {season.synopsis && (
                  <p className="mt-3 text-sm text-illuvrse-muted">{season.synopsis}</p>
                )}
                {season.episodes.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/60 p-5 text-sm text-illuvrse-muted">
                    No episodes yet.
                  </div>
                ) : (
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {season.episodes.map((episode) => (
                      <div
                        key={episode.id}
                        className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/60 p-5"
                      >
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/episode/${episode.id}`}
                            className="text-lg font-semibold text-illuvrse-snow hover:text-illuvrse-electric"
                          >
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
                        <div className="mt-4 flex gap-4 text-sm font-semibold">
                          <Link href={`/watch/${episode.id}`} className="text-illuvrse-glow">
                            Watch
                          </Link>
                          <Link href={`/episode/${episode.id}`} className="text-illuvrse-electric">
                            Details
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </section>

      {relatedShows.length > 0 && (
        <section className="mx-auto mt-10 w-full max-w-6xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold">Related shows</h2>
            <Link href="/search" className="text-sm text-illuvrse-muted">
              Browse more
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {relatedShows.map((related) => (
              <Link
                key={related.id}
                href={`/show/${related.slug}`}
                className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-5 text-sm text-illuvrse-muted transition hover:border-illuvrse-electric"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                  Recommended
                </p>
                <h3 className="mt-3 text-lg font-semibold text-illuvrse-snow">
                  {related.title}
                </h3>
                <p className="mt-2 line-clamp-3">{related.synopsis || "No synopsis yet."}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const show = await getShowBySlug(slug);

  if (!show) {
    return {
      title: "Show not found | ILLUVRSE",
      description: "This show is not available.",
    };
  }

  const description =
    show.seoDescription || show.synopsis || "Explore this ILLUVRSE original series.";

  return {
    title: `${show.title} | ILLUVRSE`,
    description,
    openGraph: {
      title: `${show.title} | ILLUVRSE`,
      description,
      images: show.posterUrl ? [{ url: show.posterUrl }] : [],
    },
  };
}
