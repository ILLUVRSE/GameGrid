"use client";

import { useEffect, useState } from "react";

type Show = { id: string; title: string };
type Season = {
  id: string;
  number: number;
  title: string | null;
  synopsis: string | null;
  show: Show;
};

export default function AdminSeasonsPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    showId: "",
    number: "",
    title: "",
    synopsis: "",
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [showsRes, seasonsRes] = await Promise.all([
          fetch("/api/admin/shows"),
          fetch("/api/admin/seasons"),
        ]);
        if (!showsRes.ok || !seasonsRes.ok) throw new Error("Failed to load");
        const showsData = (await showsRes.json()) as Show[];
        const seasonsData = (await seasonsRes.json()) as Season[];
        setShows(showsData);
        setSeasons(seasonsData);
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
      const res = await fetch("/api/admin/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showId: form.showId,
          number: Number(form.number),
          title: form.title || undefined,
          synopsis: form.synopsis || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create season");
      const updated = await fetch("/api/admin/seasons");
      setSeasons((await updated.json()) as Season[]);
      setForm({ showId: "", number: "", title: "", synopsis: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  if (loading) {
    return <div className="p-8">Loading seasons...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-6">
      <h1 className="text-2xl font-bold mb-4">Admin Seasons</h1>
      {error && <div className="mb-4 text-red-600">{error}</div>}

      <form onSubmit={handleSubmit} className="mb-8 rounded border p-4 bg-gray-50">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold">
            Show
            <select
              value={form.showId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, showId: event.target.value }))
              }
              className="mt-1 w-full rounded border px-2 py-1"
              required
            >
              <option value="">Select a show</option>
              {shows.map((show) => (
                <option key={show.id} value={show.id}>
                  {show.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Season number
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
          Create season
        </button>
      </form>

      <div className="space-y-3">
        {seasons.map((season) => (
          <div key={season.id} className="rounded border p-4">
            <div className="text-sm text-gray-500">
              {season.show.title} · Season {season.number}
            </div>
            <div className="font-semibold">{season.title || "Untitled season"}</div>
            <div className="text-sm text-gray-600">
              {season.synopsis || "No synopsis"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
