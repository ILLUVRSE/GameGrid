import { notFound } from 'next/navigation';
import { getShowBySlug } from '@/lib/db/show';

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

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-3">{show.title}</h1>
        {show.synopsis && <p className="text-lg text-gray-300 mb-8">{show.synopsis}</p>}

        {show.seasons.length === 0 ? (
          <p className="text-gray-400">No seasons available yet.</p>
        ) : (
          <div className="space-y-8">
            {show.seasons.map((season) => (
              <section key={season.id}>
                <h2 className="text-2xl font-semibold mb-2">
                  Season {season.number}
                  {season.title ? `: ${season.title}` : ''}
                </h2>
                {season.synopsis && (
                  <p className="text-gray-400 mb-4">{season.synopsis}</p>
                )}
                {season.episodes.length === 0 ? (
                  <p className="text-gray-500">No episodes yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {season.episodes.map((episode) => (
                      <li key={episode.id} className="border border-white/10 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">
                              {episode.number}. {episode.title}
                            </h3>
                            {episode.synopsis && (
                              <p className="text-sm text-gray-400 mt-1">{episode.synopsis}</p>
                            )}
                          </div>
                          {episode.videoAsset?.durationSec && (
                            <span className="text-xs text-emerald-300">
                              {Math.round(episode.videoAsset.durationSec / 60)} min
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
