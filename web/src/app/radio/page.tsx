"use client";

import { useMemo, useState } from "react";

type Station = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  items: Array<{
    id: string;
    position: number;
    episode: {
      id: string;
      title: string;
      season: { number: number; show: { title: string } };
    };
  }>;
};

const exampleThemes = [
  "ILLUVRSE night drive",
  "Neon noir chase mix",
  "Cosmic calm and starlight",
  "Kinetic arcade heat",
  "Lunar synthwave atlas",
  "Volt city afterhours",
];

export default function RadioPage() {
  const [theme, setTheme] = useState("ILLUVRSE night drive");
  const [limit, setLimit] = useState(12);
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const stationMetrics = useMemo(() => {
    if (!station) return null;
    const showSet = new Set(station.items.map((item) => item.episode.season.show.title));
    const seasonSet = new Set(
      station.items.map(
        (item) => `${item.episode.season.show.title}-${item.episode.season.number}`,
      ),
    );
    return {
      showCount: showSet.size,
      seasonCount: seasonSet.size,
      nowPlaying: station.items[0],
      queueDepth: station.items.length,
    };
  }, [station]);

  const signalStrength = Math.min(100, 58 + Math.round((limit - 6) * 2.5));

  const handleGenerate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/radio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, limit }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Radio request failed.");
        return;
      }
      setStation(data as Station);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="illuvrse-grid relative min-h-screen overflow-hidden bg-illuvrse-night">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-illuvrse-electric/20 blur-3xl" />
        <div className="absolute right-12 top-48 h-64 w-64 rounded-full bg-illuvrse-ember/20 blur-3xl" />
        <div className="absolute bottom-12 left-16 h-72 w-72 rounded-full bg-illuvrse-glow/10 blur-3xl" />
      </div>
      <section className="relative mx-auto w-full max-w-6xl px-6 pb-16 pt-12 text-illuvrse-snow">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="rounded-3xl border border-illuvrse-stroke bg-illuvrse-panel/80 p-8 md:p-12">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                ILLUVRSE Radio
              </p>
              <h1 className="mt-4 font-display text-3xl font-semibold md:text-4xl">
                Spin a living station from your catalog
              </h1>
              <p className="mt-3 text-base text-illuvrse-muted md:text-lg">
                Generate a themed lineup of episodes and let the ILLUVRSE radio engine
                score the vibe for you.
              </p>
            </div>

            <form onSubmit={handleGenerate} className="mt-10 space-y-6">
              <div>
                <label className="text-sm font-medium text-illuvrse-snow">
                  Station theme
                </label>
                <input
                  value={theme}
                  onChange={(event) => setTheme(event.target.value)}
                  placeholder="Describe the mood, genre, or energy..."
                  className="mt-2 w-full rounded-2xl border border-illuvrse-stroke bg-illuvrse-night/70 p-4 text-sm text-illuvrse-snow outline-none transition focus:border-illuvrse-electric"
                />
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-illuvrse-muted">
                  {exampleThemes.map((example) => (
                    <button
                      type="button"
                      key={example}
                      onClick={() => setTheme(example)}
                      className="rounded-full border border-illuvrse-stroke px-3 py-1 transition hover:border-illuvrse-electric hover:text-illuvrse-snow"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              <label className="text-sm font-medium text-illuvrse-snow">
                Episodes in queue
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  <input
                    type="number"
                    min={6}
                    max={24}
                    value={limit}
                    onChange={(event) => setLimit(Number(event.target.value))}
                    className="w-full max-w-[120px] rounded-xl border border-illuvrse-stroke bg-illuvrse-night/70 px-3 py-2 text-sm text-illuvrse-snow"
                  />
                  <div className="flex-1">
                    <div className="h-2 w-full rounded-full bg-illuvrse-night/70">
                      <div
                        className="h-2 rounded-full bg-illuvrse-electric transition-all"
                        style={{ width: `${Math.min(100, (limit / 24) * 100)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-illuvrse-muted">
                      Signal strength {signalStrength}%
                    </p>
                  </div>
                </div>
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-full bg-illuvrse-glow px-6 py-3 text-sm font-semibold text-illuvrse-night transition hover:bg-illuvrse-ember disabled:opacity-60"
                >
                  {loading ? "Tuning..." : "Generate radio station"}
                </button>
                <button
                  type="button"
                  disabled={!station}
                  className="rounded-full border border-illuvrse-stroke px-6 py-3 text-sm font-semibold text-illuvrse-snow transition hover:border-illuvrse-electric hover:text-illuvrse-electric disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-illuvrse-stroke disabled:hover:text-illuvrse-snow"
                >
                  Save to library
                </button>
              </div>
              {error && <p className="text-sm text-illuvrse-ember">{error}</p>}
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-illuvrse-stroke bg-gradient-to-br from-[#111b2a] to-[#1c2941] p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                Signal deck
              </p>
              <div className="mt-4 space-y-4 text-sm">
                <div className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                    Current theme
                  </p>
                  <p className="mt-2 text-base font-semibold">{theme}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                      Queue size
                    </p>
                    <p className="mt-2 text-lg font-semibold">{limit}</p>
                  </div>
                  <div className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                      Signal
                    </p>
                    <p className="mt-2 text-lg font-semibold">{signalStrength}%</p>
                  </div>
                </div>
                <p className="text-xs text-illuvrse-muted">
                  Auto-curated stations refresh every time you tune in.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                On air
              </p>
              {stationMetrics ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                      {station?.slug}
                    </p>
                    <p className="mt-2 text-xl font-semibold">{station?.name}</p>
                    <p className="mt-2 text-sm text-illuvrse-muted">
                      {station?.description || "Custom station lineup ready."}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/60 p-3">
                      <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                        Episodes
                      </p>
                      <p className="mt-2 text-lg font-semibold">
                        {stationMetrics.queueDepth}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/60 p-3">
                      <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                        Shows
                      </p>
                      <p className="mt-2 text-lg font-semibold">
                        {stationMetrics.showCount}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/60 p-3">
                      <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                        Seasons
                      </p>
                      <p className="mt-2 text-lg font-semibold">
                        {stationMetrics.seasonCount}
                      </p>
                    </div>
                  </div>
                  {stationMetrics.nowPlaying && (
                    <div className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/60 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                        Now spinning
                      </p>
                      <p className="mt-2 text-sm font-semibold text-illuvrse-snow">
                        {stationMetrics.nowPlaying.episode.season.show.title}
                      </p>
                      <p className="mt-1 text-sm text-illuvrse-muted">
                        S{stationMetrics.nowPlaying.episode.season.number} ·{" "}
                        {stationMetrics.nowPlaying.episode.title}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-illuvrse-muted">
                  Generate a station to see the signal.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Station output</h2>
            {loading && (
              <span className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                Generating...
              </span>
            )}
          </div>
          {station ? (
            <div className="mt-4 space-y-5">
              <div className="rounded-2xl border border-illuvrse-stroke bg-illuvrse-panel/60 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                  Queue
                </p>
                <ul className="mt-4 space-y-3 text-sm text-illuvrse-snow">
                  {station.items.map((item) => (
                    <li key={item.id} className="flex flex-wrap gap-2">
                      <span className="text-illuvrse-glow">{item.position}.</span>
                      <span>{item.episode.season.show.title}</span>
                      <span className="text-illuvrse-muted">
                        S{item.episode.season.number}
                      </span>
                      <span>·</span>
                      <span>{item.episode.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-illuvrse-muted">
              Generate a station to see the queue.
            </p>
          )}
        </div>

        <p className="mt-6 text-xs text-illuvrse-muted">
          Requires `OPENAI_API_KEY` in `web/.env` to run on the server.
        </p>
      </section>
    </main>
  );
}
