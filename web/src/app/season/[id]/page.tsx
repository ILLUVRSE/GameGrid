import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function SeasonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
