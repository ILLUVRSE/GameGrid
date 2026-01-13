"use client";

import { useState } from "react";

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
];

export default function NarrativePage() {
  const [theme, setTheme] = useState("ILLUVRSE night drive");
  const [limit, setLimit] = useState(12);
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    <main className="illuvrse-grid min-h-screen bg-illuvrse-night">
      <section className="mx-auto w-full max-w-5xl px-6 pb-16 pt-12 text-illuvrse-snow">
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
              <label className="text-sm font-medium text-illuvrse-snow">Station theme</label>
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
              <input
                type="number"
                min={6}
                max={24}
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
                className="mt-2 w-full max-w-xs rounded-xl border border-illuvrse-stroke bg-illuvrse-night/70 px-3 py-2 text-sm text-illuvrse-snow"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-illuvrse-glow px-6 py-3 text-sm font-semibold text-illuvrse-night transition hover:bg-illuvrse-ember disabled:opacity-60"
            >
              {loading ? "Tuning..." : "Generate radio station"}
            </button>
            {error && <p className="text-sm text-illuvrse-ember">{error}</p>}
          </form>
        </div>

        <div className="mt-8 rounded-3xl border border-illuvrse-stroke bg-illuvrse-panel/70 p-8">
          <h2 className="text-lg font-semibold">Station output</h2>
          {station ? (
            <div className="mt-4 space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">
                  {station.slug}
                </p>
                <p className="mt-2 text-2xl font-semibold">{station.name}</p>
                <p className="mt-2 text-sm text-illuvrse-muted">
                  {station.description || "Custom station lineup ready."}
                </p>
              </div>
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
