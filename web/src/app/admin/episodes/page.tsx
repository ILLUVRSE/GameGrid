"use client";

import { useEffect, useState } from "react";

type Season = { id: string; number: number; show: { title: string } };
type Episode = {
  id: string;
  number: number;
  title: string;
  synopsis: string | null;
  season: Season;
};

export default function AdminEpisodesPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    seasonId: "",
    number: "",
    title: "",
    synopsis: "",
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [seasonsRes, episodesRes] = await Promise.all([
          fetch("/api/admin/seasons"),
          fetch("/api/admin/episodes"),
        ]);
        if (!seasonsRes.ok || !episodesRes.ok) throw new Error("Failed to load");
        const seasonsData = (await seasonsRes.json()) as Season[];
        const episodesData = (await episodesRes.json()) as Episode[];
        setSeasons(seasonsData);
        setEpisodes(episodesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/admin/episodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonId: form.seasonId,
          number: Number(form.number),
          title: form.title,
          synopsis: form.synopsis || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create episode");
      const updated = await fetch("/api/admin/episodes");
      setEpisodes((await updated.json()) as Episode[]);
      setForm({ seasonId: "", number: "", title: "", synopsis: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  if (loading) {
    return <div className="p-8">Loading episodes...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-6">
      <h1 className="text-2xl font-bold mb-4">Admin Episodes</h1>
      {error && <div className="mb-4 text-red-600">{error}</div>}

      <form onSubmit={handleSubmit} className="mb-8 rounded border p-4 bg-gray-50">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold">
            Season
            <select
              value={form.seasonId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, seasonId: event.target.value }))
              }
              className="mt-1 w-full rounded border px-2 py-1"
              required
            >
              <option value="">Select a season</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.show.title} · Season {season.number}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Episode number
            <input
              value={form.number}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, number: event.target.value }))
              }
              type="number"
              min="1"
              className="mt-1 w-full rounded border px-2 py-1"
              required
            />
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold">
            Title
            <input
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
              className="mt-1 w-full rounded border px-2 py-1"
              required
            />
          </label>
          <label className="text-sm font-semibold">
            Synopsis
            <input
              value={form.synopsis}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, synopsis: event.target.value }))
              }
              className="mt-1 w-full rounded border px-2 py-1"
            />
          </label>
        </div>
        <button
          type="submit"
          className="mt-4 rounded bg-blue-600 px-4 py-2 text-white"
        >
          Create episode
        </button>
      </form>

      <div className="space-y-3">
        {episodes.map((episode) => (
          <div key={episode.id} className="rounded border p-4">
            <div className="text-sm text-gray-500">
              {episode.season.show.title} · Season {episode.season.number} · Episode{" "}
              {episode.number}
            </div>
            <div className="font-semibold">{episode.title}</div>
            <div className="text-sm text-gray-600">
              {episode.synopsis || "No synopsis"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
